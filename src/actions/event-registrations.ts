"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/database";
import { auth, getServerAuthSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth-guard";
import { getMessagingService } from "@/lib/messaging";
import { renderEmail } from "@/lib/email-templates/render";
import { BrandedTextEmail } from "@/lib/email-templates/BrandedTextEmail";
import { ROLES, serializeRoles } from "@/lib/rbac/roles";
import { escapeHtml } from "@/lib/rich-text";
import {
  findMemberByContact,
  isRegistrationOpen,
  maskName,
} from "@/lib/event-registration";
import { registerEmailUrl, registerLocation } from "@/lib/event-subdomain";
import {
  createEventAccountSchema,
  parseRegistrationFields,
  registrationSubmitSchema,
  validateAnswers,
  type RegistrationSubmitInput,
} from "@/lib/schemas/event-registration.schema";

// Member-facing actions return errors instead of throwing: thrown messages
// are hidden by Next.js in production.
type Result<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

const fail = (error: string) => ({ success: false as const, error });

const eventSelect = {
  id: true,
  slug: true,
  title: true,
  date: true,
  endDate: true,
  time: true,
  location: true,
  status: true,
  registrationEnabled: true,
  registrationClosesAt: true,
  registrationFields: true,
} satisfies Prisma.EventSelect;

/**
 * Create a login (no membership) for someone new, then email a sign-in link
 * that returns them to the form. Same response whether or not the email
 * already has an account, so this can't be used to probe who is registered.
 * No session is created here: clicking the emailed link proves ownership.
 */
export async function createEventAccount(input: {
  eventSlug: string;
  name: string;
  email: string;
}): Promise<Result> {
  const parsed = createEventAccountSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid details");
  const { eventSlug, name, email } = parsed.data;

  const event = await prisma.event.findFirst({
    where: { slug: eventSlug, status: "PUBLISHED", registrationEnabled: true },
    select: eventSelect,
  });
  if (!event || !isRegistrationOpen(event)) return fail("Registration is closed.");

  // ponytail: no per-IP throttle on direct auth.api calls (Better Auth's rate
  // limit only covers its HTTP routes). Add one if sign-up spam shows up.
  const ctx = await auth.$context;
  const existing = await ctx.internalAdapter.findUserByEmail(email);
  if (!existing) {
    try {
      await ctx.internalAdapter.createUser({
        email,
        name,
        emailVerified: false,
        role: serializeRoles([ROLES.MEMBER]), // portal access only, not membership
      });
    } catch {
      // Lost a race with a parallel request — the user exists now; carry on.
    }
  }

  try {
    const h = await headers();
    await auth.api.signInMagicLink({
      body: { email, callbackURL: registerLocation(event.slug, h.get("host")).url },
      headers: h,
    });
  } catch (err) {
    console.error("[event-registration] magic link failed:", err);
    return fail("We couldn't send the email. Please try again.");
  }
  return { success: true, data: undefined };
}

/** Exact phone/email lookup for adding someone already in our records. */
export async function findPersonForRegistration(
  contact: string,
): Promise<Result<{ name: string } | null>> {
  const session = await getServerAuthSession();
  if (!session) return fail("Please sign in first.");
  // ponytail: unthrottled; add rate limiting if lookups are abused.
  const match = await findMemberByContact(String(contact ?? "").slice(0, 200));
  return { success: true, data: match ? { name: maskName(match.fullName) } : null };
}

export async function submitEventRegistration(
  input: RegistrationSubmitInput,
): Promise<Result<{ registrationId: string }>> {
  const session = await getServerAuthSession();
  if (!session) return fail("Please sign in first.");

  const parsed = registrationSubmitSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form");
  const data = parsed.data;

  const event = await prisma.event.findUnique({
    where: { id: data.eventId },
    select: eventSelect,
  });
  if (!event || !isRegistrationOpen(event)) return fail("Registration is closed.");

  const fields = parseRegistrationFields(event.registrationFields);
  const bookingAnswers = validateAnswers(fields, "booking", data.answers);
  if (!bookingAnswers.ok) return fail(bookingAnswers.error);

  let me = await prisma.member.findUnique({
    where: { userId: session.user.id },
    select: { id: true, fullName: true, email: true, householdId: true },
  });
  if (!me && !data.self) return fail("Please fill in your details.");

  const existing = me
    ? await prisma.eventRegistration.findUnique({
        where: { eventId_registrantId: { eventId: event.id, registrantId: me.id } },
        select: { id: true, attendees: { select: { memberId: true } } },
      })
    : null;
  const onBooking = new Set(existing?.attendees.map((a) => a.memberId));
  const household = me?.householdId
    ? new Set(
        (
          await prisma.member.findMany({
            where: { householdId: me.householdId },
            select: { id: true },
          })
        ).map((m) => m.id),
      )
    : new Set<string>();

  // Resolve every attendee to a verified memberId, or a new person to create.
  type Resolved = {
    memberId: string | null; // null = "self" before the registrant exists, or new
    isSelf: boolean;
    newPerson?: Extract<(typeof data.attendees)[number], { kind: "new" }>;
    relationship: "SELF" | "SPOUSE" | "CHILD" | "GUEST";
    ageGroup?: "ADULT" | "TEEN" | "CHILD" | "INFANT";
    dietaryPreference?: string;
    allergies?: string;
    answers: Record<string, string | boolean>;
  };
  const resolved: Resolved[] = [];
  for (const a of data.attendees) {
    const answers = validateAnswers(fields, "person", a.answers);
    if (!answers.ok) return fail(answers.error);
    const base = {
      ageGroup: a.ageGroup,
      dietaryPreference: a.dietaryPreference,
      allergies: a.allergies,
      answers: answers.value,
    };
    if (a.kind === "self") {
      resolved.push({ ...base, memberId: me?.id ?? null, isSelf: true, relationship: "SELF" });
    } else if (a.kind === "known") {
      if (!household.has(a.memberId) && !onBooking.has(a.memberId)) {
        return fail("We couldn't verify one of the people on this booking.");
      }
      resolved.push({ ...base, memberId: a.memberId, isSelf: false, relationship: a.relationship });
    } else if (a.kind === "lookup") {
      const match = await findMemberByContact(a.contact);
      if (!match) return fail(`No one found for ${a.contact}. Add them manually instead.`);
      resolved.push({ ...base, memberId: match.id, isSelf: false, relationship: a.relationship });
    } else {
      resolved.push({ ...base, memberId: null, isSelf: false, newPerson: a, relationship: a.relationship });
    }
  }
  if (resolved.filter((r) => r.isSelf).length > 1) return fail("You're on the list twice.");
  const knownIds = resolved.map((r) => r.memberId).filter((id): id is string => !!id);
  if (new Set(knownIds).size !== knownIds.length) {
    return fail("The same person is on the list twice.");
  }

  if (knownIds.length) {
    const elsewhere = await prisma.eventAttendee.findFirst({
      where: {
        eventId: event.id,
        memberId: { in: knownIds },
        ...(existing ? { registrationId: { not: existing.id } } : {}),
      },
      select: { member: { select: { fullName: true } } },
    });
    if (elsewhere) {
      return fail(`${maskName(elsewhere.member.fullName)} is already registered for this event on another booking.`);
    }
  }

  let registrationId: string;
  try {
    registrationId = await prisma.$transaction(async (tx) => {
      if (!me) {
        me = await tx.member.create({
          data: {
            userId: session.user.id,
            fullName: data.self!.fullName,
            phone: data.self!.phone,
            gender: data.self!.gender,
            email: session.user.email,
            // status defaults to VISITOR — registering never grants membership
          },
          select: { id: true, fullName: true, email: true, householdId: true },
        });
      }
      const registrant = me;

      let householdId = registrant.householdId;
      const needsHousehold = resolved.some(
        (r) => r.newPerson && r.relationship !== "GUEST",
      );
      if (needsHousehold && !householdId) {
        const hh = await tx.household.create({
          data: { name: `${registrant.fullName} household` },
        });
        householdId = hh.id;
        await tx.member.update({ where: { id: registrant.id }, data: { householdId } });
      }

      for (const r of resolved) {
        if (r.isSelf) r.memberId = registrant.id;
        if (r.newPerson) {
          const p = r.newPerson;
          const created = await tx.member.create({
            data: {
              fullName: p.fullName,
              gender: p.gender,
              phone: p.phone,
              email: p.email,
              householdId: r.relationship === "GUEST" ? null : householdId,
            },
            select: { id: true },
          });
          r.memberId = created.id;
        }
      }

      const booking = {
        arrivalDate: new Date(`${data.arrivalDate}T00:00:00Z`),
        arrivalTime: data.arrivalTime ?? null,
        travelMode: data.travelMode ?? null,
        origin: data.origin ?? null,
        notes: data.notes ?? null,
        contactConsent: data.contactConsent,
        answers: bookingAnswers.value,
      };
      const registration = await tx.eventRegistration.upsert({
        where: { eventId_registrantId: { eventId: event.id, registrantId: registrant.id } },
        create: { eventId: event.id, registrantId: registrant.id, ...booking },
        update: { ...booking, status: "CONFIRMED" },
        select: { id: true },
      });

      const finalIds = resolved.map((r) => r.memberId!);
      await tx.eventAttendee.deleteMany({
        where: { registrationId: registration.id, memberId: { notIn: finalIds } },
      });
      for (const r of resolved) {
        const details = {
          relationship: r.relationship,
          ageGroup: r.ageGroup ?? null,
          dietaryPreference: r.dietaryPreference ?? null,
          allergies: r.allergies ?? null,
          answers: r.answers,
        };
        // update keeps admin-owned roomId / checkedInAt intact
        await tx.eventAttendee.upsert({
          where: { eventId_memberId: { eventId: event.id, memberId: r.memberId! } },
          create: {
            ...details,
            eventId: event.id,
            memberId: r.memberId!,
            registrationId: registration.id,
          },
          update: details,
        });
      }

      // Tag everyone with the event so they show up in the member list filters.
      const tag = await tx.tag.upsert({
        where: { label: event.title },
        create: { label: event.title },
        update: {},
        select: { id: true },
      });
      await tx.memberTag.createMany({
        data: finalIds.map((memberId) => ({ memberId, tagId: tag.id })),
        skipDuplicates: true,
      });

      return registration.id;
    }, { timeout: 20_000 }); // remote DB + one upsert per attendee
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail("Someone on this booking was just registered on another booking.");
    }
    throw err;
  }

  await logAudit({
    action: existing ? "event_registration.update" : "event_registration.create",
    subject: "EventRegistration",
    subjectId: registrationId,
    actorId: session.user.id,
    meta: { eventId: event.id, attendees: resolved.length },
  });

  await sendConfirmation({
    to: me!.email ?? session.user.email,
    event,
    registrationId,
    updated: !!existing,
  });

  revalidatePath("/me");
  revalidatePath(`/events/${event.slug}/register`);
  return { success: true, data: { registrationId } };
}

export async function cancelEventRegistration(eventId: string): Promise<Result> {
  const session = await getServerAuthSession();
  if (!session) return fail("Please sign in first.");
  const me = await prisma.member.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  const registration = me
    ? await prisma.eventRegistration.findUnique({
        where: { eventId_registrantId: { eventId, registrantId: me.id } },
        select: { id: true, event: { select: eventSelect } },
      })
    : null;
  if (!registration) return fail("No registration found.");
  if (!isRegistrationOpen(registration.event)) {
    return fail("Registration has closed — please contact the organisers to cancel.");
  }

  await prisma.eventRegistration.delete({ where: { id: registration.id } });
  await logAudit({
    action: "event_registration.cancel",
    subject: "EventRegistration",
    subjectId: registration.id,
    actorId: session.user.id,
    meta: { eventId },
  });
  revalidatePath("/me");
  revalidatePath(`/events/${registration.event.slug}/register`);
  return { success: true, data: undefined };
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function setAttendeeCheckIn(
  attendeeId: string,
  checkedIn: boolean,
): Promise<Result> {
  const session = await requirePermission("update", "Member");
  const attendee = await prisma.eventAttendee.update({
    where: { id: String(attendeeId) },
    data: { checkedInAt: checkedIn ? new Date() : null },
    select: { eventId: true },
  });
  await logAudit({
    action: checkedIn ? "event_attendee.check_in" : "event_attendee.undo_check_in",
    subject: "EventAttendee",
    subjectId: attendeeId,
    actorId: session.user.id,
  });
  revalidatePath(`/admin/content/events/${attendee.eventId}`);
  return { success: true, data: undefined };
}

async function sendConfirmation({
  to,
  event,
  registrationId,
  updated,
}: {
  to: string;
  event: { title: string; slug: string; date: Date; time: string; location: string };
  registrationId: string;
  updated: boolean;
}) {
  try {
    const attendees = await prisma.eventAttendee.findMany({
      where: { registrationId },
      select: { member: { select: { fullName: true } } },
      orderBy: { createdAt: "asc" },
    });
    const url = registerEmailUrl(event.slug);
    const date = event.date.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    const htmlBody = `
      <p>${updated ? "Your registration has been updated" : "You're registered"} for <strong>${escapeHtml(event.title)}</strong>.</p>
      <p>${escapeHtml(date)} · ${escapeHtml(event.time)}<br>${escapeHtml(event.location)}</p>
      <p><strong>On this booking:</strong></p>
      <ul>${attendees.map((a) => `<li>${escapeHtml(a.member.fullName)}</li>`).join("")}</ul>
      <p>You can view or change your registration until registration closes:<br>
      <a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`;
    const { html, text } = await renderEmail(
      BrandedTextEmail({ preview: `Registration confirmed: ${event.title}`, htmlBody }),
    );
    const result = await getMessagingService("EMAIL").send({
      to,
      subject: `${updated ? "Registration updated" : "You're registered"}: ${event.title}`,
      body: html,
      text,
    });
    if (!result.ok) console.error("[event-registration] email failed:", result.error);
  } catch (err) {
    // Never fail a saved registration because the email didn't go out.
    console.error("[event-registration] email failed:", err);
  }
}
