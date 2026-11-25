"use server";

import { log } from "@/lib/logger";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/database";
import { auth, getServerAuthSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth-guard";
import {
  findMemberByContact,
  getKnownPeople,
  isRegistrationOpen,
  maskName,
  tagRegistrationAttendees,
} from "@/lib/event-registration";
import { sendRegistrationConfirmation } from "@/lib/event-registration-email";
import { registerEmailUrl, registerLocation } from "@/lib/event-subdomain";
import { balanceMinor, chargesFees, pesewas, priceAttendees } from "@/lib/event-fees";
import { syncRegistrationPayment } from "@/lib/finance-ledger";
import { checkout, CheckoutError } from "@/lib/payments/checkout";
import { resolveMemberLocation } from "@/lib/member-location";
import { settlePaymentIntent } from "@/lib/payments/settle";
import { formatMoney } from "@/lib/format";
import { furthest, maxReminders, sendDraftReminder } from "@/lib/registration-drafts";
import type { RegistrationStep } from "@/app/generated/prisma/client";
import {
  createEventAccountSchema,
  parseRegistrationFields,
  registrationSubmitSchema,
  validateAnswers,
  type Answers,
  type RegistrationSubmitInput,
  eventPaymentInputSchema,
  registrationDraftSchema,
  type RegistrationDraftInput,
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
  allowOnline: true,
  paymentMode: true,
  feeFundId: true,
  priceTiers: { select: { id: true, name: true, amount: true } },
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
  let userId = existing?.user.id;
  if (!existing) {
    try {
      const created = await ctx.internalAdapter.createUser({
        email,
        name,
        emailVerified: false,
        role: "member", // portal access only, not membership
      });
      userId = created.id;
    } catch {
      // Lost a race with a parallel request — the user exists now; carry on.
      userId = (await ctx.internalAdapter.findUserByEmail(email))?.user.id;
    }
  }
  // Start their draft so admins see who asked for a link but never came back.
  if (userId) {
    await prisma.eventRegistrationDraft
      .upsert({
        where: { eventId_userId: { eventId: event.id, userId } },
        create: { eventId: event.id, userId },
        update: {},
      })
      .catch((err) => log.error("event-registration", "draft start failed", { err }));
  }

  try {
    const h = await headers();
    await auth.api.signInMagicLink({
      body: { email, callbackURL: registerLocation(event.slug, h.get("host")).url },
      headers: h,
    });
  } catch (err) {
    log.error("event-registration", "magic link failed", { err });
    return fail("We couldn't send the email. Please try again.");
  }
  return { success: true, data: undefined };
}

/** Autosave of the signed-in person's own form. No-op once they have a booking. */
export async function saveRegistrationDraft(eventId: string, input: RegistrationDraftInput): Promise<Result> {
  const session = await getServerAuthSession();
  if (!session) return fail("Please sign in first.");
  return writeDraft(String(eventId), session.user.id, input, { admin: false });
}

/** Admin: save progress on someone's form for them. Bound to `userId` by the admin page. */
export async function adminSaveRegistrationDraft(
  userId: string,
  eventId: string,
  input: RegistrationDraftInput,
): Promise<Result> {
  await requirePermission("update", "EventRegistration");
  return writeDraft(String(eventId), String(userId), input, { admin: true });
}

async function writeDraft(
  eventId: string,
  userId: string,
  input: RegistrationDraftInput,
  { admin }: { admin: boolean },
): Promise<Result> {
  const parsed = registrationDraftSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid draft");
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: eventSelect });
  if (!event || (!admin && !isRegistrationOpen(event))) return fail("Registration is closed.");

  // A late autosave after submitting must not reopen a finished registration.
  const booked = await prisma.eventRegistration.findFirst({
    where: { eventId, registrant: { userId } },
    select: { id: true },
  });
  if (booked) return { success: true, data: undefined };

  const step = parsed.data.step.toUpperCase() as RegistrationStep;
  const prev = await prisma.eventRegistrationDraft.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { step: true },
  });
  const data = parsed.data.data as Prisma.InputJsonObject;
  // Admin edits don't count as the participant being active (reminders).
  const activity = admin ? {} : { lastActiveAt: new Date() };
  await prisma.eventRegistrationDraft.upsert({
    where: { eventId_userId: { eventId, userId } },
    create: { eventId, userId, step, data },
    // completedAt cleared: they cancelled a booking and are starting again.
    update: { step: prev ? furthest(prev.step, step) : step, data, completedAt: null, ...activity },
  });
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
): Promise<Result<{ registrationId: string; payUrl?: string; paymentError?: string }>> {
  const session = await getServerAuthSession();
  if (!session) return fail("Please sign in first.");
  return saveRegistration(input, {
    user: session.user,
    actorId: session.user.id,
    admin: false,
    notify: true,
  });
}

/**
 * Admin: save a booking on someone's behalf (also after registration closes).
 * Never starts a checkout; an online balance stays owed and the emailed
 * confirmation links them to pay. Bound to `userId` by the admin page.
 */
export async function adminSaveRegistration(
  userId: string,
  input: RegistrationSubmitInput,
  opts?: { notify?: boolean },
): Promise<Result<{ registrationId: string; payUrl?: string; paymentError?: string }>> {
  const session = await requirePermission("update", "EventRegistration");
  const user = await prisma.user.findUnique({
    where: { id: String(userId) },
    select: { id: true, email: true },
  });
  if (!user) return fail("That person's account no longer exists.");
  return saveRegistration(input, {
    user,
    actorId: session.user.id,
    admin: true,
    notify: opts?.notify !== false,
  });
}

type SaveContext = {
  /** The registrant's login (the booking belongs to their Member). */
  user: { id: string; email: string };
  actorId: string;
  /** Admin on their behalf: skips the open check and never starts payment. */
  admin: boolean;
  notify: boolean;
};

async function saveRegistration(
  input: RegistrationSubmitInput,
  ctx: SaveContext,
): Promise<Result<{ registrationId: string; payUrl?: string; paymentError?: string }>> {
  const parsed = registrationSubmitSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check the form");
  const data = parsed.data;

  const event = await prisma.event.findUnique({
    where: { id: data.eventId },
    select: eventSelect,
  });
  if (!event || (!ctx.admin && !isRegistrationOpen(event))) return fail("Registration is closed.");

  const fields = parseRegistrationFields(event.registrationFields);
  const isOnline = (a: { attendance: string }) => a.attendance === "ONLINE";
  if (!event.allowOnline && data.attendees.some(isOnline)) {
    return fail("This event can only be attended in person.");
  }
  const anyoneInPerson = data.attendees.some((a) => !isOnline(a));
  const bookingAnswers = validateAnswers(fields, "booking", data.answers, anyoneInPerson);
  if (!bookingAnswers.ok) return fail(bookingAnswers.error);

  let me = await prisma.member.findUnique({
    where: { userId: ctx.user.id },
    select: { id: true, fullName: true, email: true, householdId: true },
  });
  if (!me && !data.self) return fail("Please fill in your details.");

  // Ids re-checked against our tables; one lookup per distinct place.
  const places = new Map<string, Awaited<ReturnType<typeof resolveMemberLocation>>>();
  for (const a of data.attendees) {
    const key = JSON.stringify(a.location);
    if (!places.has(key)) places.set(key, await resolveMemberLocation(a.location));
  }

  const existing = me
    ? await prisma.eventRegistration.findUnique({
        where: { eventId_registrantId: { eventId: event.id, registrantId: me.id } },
        select: {
          id: true,
          status: true,
          amountPaid: true,
          attendees: { select: { memberId: true, priceTierId: true, tierName: true, amount: true } },
        },
      })
    : null;
  const onBooking = new Set(existing?.attendees.map((a) => a.memberId));
  const known = new Set(me ? (await getKnownPeople(me)).map((p) => p.id) : []);

  // Resolve every attendee to a verified memberId, or a new person to create.
  type Resolved = {
    memberId: string | null; // null = "self" before the registrant exists, or new
    isSelf: boolean;
    newPerson?: Extract<(typeof data.attendees)[number], { kind: "new" }>;
    relationship: "SELF" | "SPOUSE" | "CHILD" | "RELATIVE" | "GUEST";
    ageGroup?: "ADULT" | "TEEN" | "CHILD" | "INFANT";
    priceTierId?: string;
    attendance: "IN_PERSON" | "ONLINE";
    location: Awaited<ReturnType<typeof resolveMemberLocation>>;
    answers: Answers;
  };
  const resolved: Resolved[] = [];
  for (const a of data.attendees) {
    const online = isOnline(a);
    const guest = a.kind !== "self" && a.relationship === "GUEST";
    const answers = validateAnswers(fields, "person", a.answers, !online, guest);
    if (!answers.ok) return fail(answers.error);
    const location = places.get(JSON.stringify(a.location))!;
    if (!location.countryId) return fail("Pick a country for everyone on the booking.");
    const base = {
      ageGroup: a.ageGroup,
      // Following online is free.
      priceTierId: online ? undefined : a.priceTierId,
      attendance: a.attendance,
      location,
      answers: answers.value,
    };
    if (a.kind === "self") {
      resolved.push({ ...base, memberId: me?.id ?? null, isSelf: true, relationship: "SELF" });
    } else if (a.kind === "known") {
      if (!known.has(a.memberId) && !onBooking.has(a.memberId)) {
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

  // Fees are priced here from the DB, never from the client. People who keep
  // the tier they booked keep their price even if the admin changed it since.
  const charges = chargesFees(event.paymentMode) && event.priceTiers.length > 0;
  if (charges && resolved.some((r) => r.attendance === "IN_PERSON" && !r.priceTierId)) {
    return fail("Pick a price for everyone on the booking.");
  }
  const previous = new Map(existing?.attendees.map((a) => [a.memberId, a]));
  const priced = priceAttendees(
    event.priceTiers,
    resolved.map((r) => ({
      priceTierId: charges ? (r.priceTierId ?? null) : null,
      previous: charges && r.memberId ? previous.get(r.memberId) : null,
    })),
  );
  if (!priced) return fail("The prices for this event have changed. Please refresh the page and try again.");
  const paidMinor = existing ? pesewas(existing.amountPaid) : 0;
  if (priced.totalMinor < paidMinor) {
    return fail("This booking is already paid. Please contact us to remove people or change prices.");
  }
  const owes = priced.totalMinor > paidMinor;
  // Online events hold new bookings until paid. An already-confirmed booking
  // that adds people stays confirmed and shows a balance to pay.
  const status =
    event.paymentMode === "ONLINE" && owes && (!existing || existing.status === "PENDING_PAYMENT")
      ? ("PENDING_PAYMENT" as const)
      : ("CONFIRMED" as const);
  const money = (minor: number) => (minor / 100).toFixed(2);

  let registrationId: string;
  try {
    registrationId = await prisma.$transaction(async (tx) => {
      if (!me) {
        me = await tx.member.create({
          data: {
            userId: ctx.user.id,
            fullName: data.self!.fullName,
            phone: data.self!.phone,
            gender: data.self!.gender,
            email: ctx.user.email,
            // status defaults to VISITOR — registering never grants membership
          },
          select: { id: true, fullName: true, email: true, householdId: true },
        });
      }
      const registrant = me;

      let householdId = registrant.householdId;
      // Only spouses and children join the registrant's household.
      const inHousehold = (r: Resolved) => r.relationship === "SPOUSE" || r.relationship === "CHILD";
      // Existing spouses/children: no login and no household → join now (never
      // move someone). With a login they get an invite to accept themselves —
      // lookup-by-phone would otherwise let anyone claim a stranger.
      const existingFamily = resolved.filter((r) => !r.isSelf && !r.newPerson && inHousehold(r));
      const family = existingFamily.length
        ? await tx.member.findMany({
            where: { id: { in: existingFamily.map((r) => r.memberId!) } },
            select: { id: true, userId: true, householdId: true },
          })
        : [];
      const linkable = family.filter((m) => !m.userId && !m.householdId);
      const toInvite = family.filter((m) => m.userId && (!m.householdId || m.householdId !== householdId));
      if (toInvite.length) {
        await tx.householdInvite.createMany({
          data: toInvite.map((m) => ({
            fromMemberId: registrant.id,
            toMemberId: m.id,
            relationship: existingFamily.find((r) => r.memberId === m.id)!.relationship,
          })),
          skipDuplicates: true, // a declined invite stays declined
        });
      }
      const needsHousehold = linkable.length > 0 || resolved.some((r) => r.newPerson && inHousehold(r));
      if (needsHousehold && !householdId) {
        const hh = await tx.household.create({
          data: { name: `${registrant.fullName} household` },
        });
        householdId = hh.id;
        await tx.member.update({ where: { id: registrant.id }, data: { householdId } });
      }
      if (linkable.length) {
        await tx.member.updateMany({
          where: { id: { in: linkable.map((m) => m.id) }, householdId: null },
          data: { householdId },
        });
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
              householdId: inHousehold(r) ? householdId : null,
              ...r.location,
            },
            select: { id: true },
          });
          r.memberId = created.id;
        } else {
          // Fill in profiles that have no location yet; never overwrite one.
          await tx.member.updateMany({
            where: { id: r.memberId!, countryId: null, cityId: null },
            data: r.location,
          });
        }
      }

      const booking = { answers: bookingAnswers.value, amountDue: money(priced.totalMinor), status };
      const registration = await tx.eventRegistration.upsert({
        where: { eventId_registrantId: { eventId: event.id, registrantId: registrant.id } },
        create: { eventId: event.id, registrantId: registrant.id, ...booking },
        update: booking,
        select: { id: true },
      });

      const finalIds = resolved.map((r) => r.memberId!);
      await tx.eventAttendee.deleteMany({
        where: { registrationId: registration.id, memberId: { notIn: finalIds } },
      });
      for (const [i, r] of resolved.entries()) {
        const p = priced.attendees[i];
        const details = {
          relationship: r.relationship,
          ageGroup: r.ageGroup ?? null,
          attendance: r.attendance,
          countryId: r.location.countryId,
          regionId: r.location.regionId,
          cityId: r.location.cityId,
          city: r.location.city,
          // Online people don't take a bed.
          ...(r.attendance === "ONLINE" ? { roomId: null } : {}),
          answers: r.answers,
          priceTierId: p.priceTierId,
          tierName: p.tierName,
          amount: charges ? money(p.amountMinor) : null,
        };
        // update keeps admin-owned roomId (unless now online) / checkedInAt intact
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

      await syncRegistrationPayment(tx, registration.id);
      if (!existing) {
        // Keep the draft row (funnel + reminder stats); drop its answers.
        const done = { step: "REVIEW" as const, data: Prisma.DbNull, completedAt: new Date() };
        await tx.eventRegistrationDraft.upsert({
          where: { eventId_userId: { eventId: event.id, userId: ctx.user.id } },
          create: { eventId: event.id, userId: ctx.user.id, ...done },
          update: done,
        });
      }
      // Tag everyone with the event (member-list filters) — not while awaiting payment.
      if (status === "CONFIRMED") await tagRegistrationAttendees(tx, [registration.id]);

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
    actorId: ctx.actorId,
    meta: {
      eventId: event.id,
      attendees: resolved.length,
      ...(ctx.admin ? { onBehalfOfUserId: ctx.user.id } : {}),
    },
  });

  // Online bookings get their email once paid (settle), except when an admin
  // books for them: then the email carries the balance and the pay link.
  if (ctx.notify && (status === "CONFIRMED" || ctx.admin)) {
    await sendRegistrationConfirmation({
      registrationId,
      updated: !!existing,
      to: me!.email ?? ctx.user.email,
    });
  }

  revalidatePath("/me");
  revalidatePath(`/events/${event.slug}/register`);
  revalidatePath(`/admin/content/events/${event.id}`);

  if (!ctx.admin && event.paymentMode === "ONLINE" && owes) {
    const pay = await beginPayment(registrationId, ctx.user.email);
    // The booking is saved either way; the page offers "Complete payment".
    return pay.success
      ? { success: true, data: { registrationId, payUrl: pay.data.payUrl } }
      : { success: true, data: { registrationId, paymentError: pay.error } };
  }
  return { success: true, data: { registrationId } };
}

/**
 * Start (or resume) online payment of a booking's balance. Earlier checkouts
 * are re-verified first, so a payment whose webhook is slow gets settled
 * rather than charged twice.
 */
async function beginPayment(registrationId: string, fallbackEmail: string): Promise<Result<{ payUrl: string }>> {
  const open = await prisma.paymentIntent.findMany({
    where: { eventRegistrationId: registrationId, status: { in: ["PENDING", "PROCESSING"] } },
    select: { reference: true },
  });
  for (const i of open) await settlePaymentIntent(i.reference).catch(() => undefined);

  const reg = await prisma.eventRegistration.findUnique({
    where: { id: registrationId },
    select: {
      amountDue: true,
      amountPaid: true,
      registrantId: true,
      registrant: { select: { fullName: true, email: true } },
      event: { select: { slug: true, paymentMode: true, feeFundId: true } },
    },
  });
  if (!reg) return fail("Booking not found.");
  const balance = balanceMinor(reg.amountDue, reg.amountPaid);
  if (balance === 0) return fail("This booking is already paid — thank you!");
  if (reg.event.paymentMode !== "ONLINE" || !reg.event.feeFundId) {
    return fail("Online payment isn't available for this event.");
  }
  try {
    const { redirectUrl } = await checkout({
      amount: new Prisma.Decimal(balance).div(100),
      fundId: reg.event.feeFundId,
      email: reg.registrant.email ?? fallbackEmail,
      donorName: reg.registrant.fullName,
      memberId: reg.registrantId,
      eventRegistrationId: registrationId,
      callbackUrl: registerEmailUrl(reg.event.slug),
    });
    return { success: true, data: { payUrl: redirectUrl } };
  } catch (err) {
    if (err instanceof CheckoutError) return fail(err.message);
    // e.g. PAYSTACK_SECRET_KEY missing or Paystack unreachable.
    log.error("event-registration", "checkout failed", { err });
    return fail("Online payment isn't available right now. Please try again later.");
  }
}

/** "Complete payment" on the register page, for the signed-in registrant's own booking. */
export async function startEventPayment(eventId: string): Promise<Result<{ payUrl: string }>> {
  const session = await getServerAuthSession();
  if (!session) return fail("Please sign in first.");
  const me = await prisma.member.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  const reg = me
    ? await prisma.eventRegistration.findUnique({
        where: { eventId_registrantId: { eventId, registrantId: me.id } },
        select: { id: true },
      })
    : null;
  if (!reg) return fail("No registration found.");
  return beginPayment(reg.id, session.user.email);
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
        select: { id: true, amountPaid: true, event: { select: eventSelect } },
      })
    : null;
  if (!registration) return fail("No registration found.");
  if (pesewas(registration.amountPaid) > 0) {
    return fail("This booking has been paid for — please contact the organisers to cancel it.");
  }
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
  const session = await requirePermission("update", "EventRegistration");
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

/**
 * Desk staff record a fee paid at the event. Deliberately narrow so it can sit
 * behind the check-in permission rather than finance's: it only ever writes to
 * this event's fee fund, for this booking, up to the balance owed. Wrong
 * entries are voided by finance in the ledger.
 */
export async function recordEventPayment(
  registrationId: string,
  input: { amount: number | string; method: string; reference?: string },
): Promise<Result> {
  const session = await requirePermission("update", "EventRegistration");
  const parsed = eventPaymentInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the payment details");
  const data = parsed.data;

  const reg = await prisma.eventRegistration.findUnique({
    where: { id: String(registrationId) },
    select: {
      id: true,
      amountDue: true,
      amountPaid: true,
      registrantId: true,
      registrant: { select: { fullName: true } },
      event: { select: { id: true, title: true, paymentMode: true, feeFundId: true } },
    },
  });
  if (!reg) return fail("Booking not found.");
  if (!chargesFees(reg.event.paymentMode) || !reg.event.feeFundId) {
    return fail("This event doesn't collect fees.");
  }
  const balance = balanceMinor(reg.amountDue, reg.amountPaid);
  const amountMinor = pesewas(data.amount);
  if (balance === 0) return fail("This booking is already paid.");
  if (amountMinor > balance) return fail(`That's more than the GH₵${(balance / 100).toFixed(2)} still owed.`);

  const income = await prisma.$transaction(async (tx) => {
    const row = await tx.income.create({
      data: {
        fundId: reg.event.feeFundId!,
        amount: (amountMinor / 100).toFixed(2),
        receivedAt: new Date(),
        method: data.method,
        reference: data.reference,
        memberId: reg.registrantId,
        donorName: reg.registrant.fullName,
        eventRegistrationId: reg.id,
        note: `${reg.event.title} registration (paid at the event)`,
        recordedById: session.user.id,
      },
      select: { id: true },
    });
    await syncRegistrationPayment(tx, reg.id);
    return row;
  });
  await logAudit({
    action: "event_registration.payment",
    subject: "EventRegistration",
    subjectId: reg.id,
    actorId: session.user.id,
    meta: { incomeId: income.id, amount: amountMinor / 100, method: data.method },
  });
  revalidatePath(`/admin/content/events/${reg.event.id}`);
  revalidatePath("/admin/finance", "layout");
  return { success: true, data: undefined };
}

/** Admin: send one "finish your registration" reminder now (counts toward the limit). */
export async function sendRegistrationReminder(draftId: string): Promise<Result> {
  const session = await requirePermission("update", "EventRegistration");
  const draft = await prisma.eventRegistrationDraft.findUnique({
    where: { id: String(draftId) },
    select: { id: true, eventId: true, remindersSent: true, user: { select: { emailVerified: true } } },
  });
  if (!draft) return fail("That registration is no longer in progress.");
  if (draft.remindersSent >= maxReminders(draft.user.emailVerified)) {
    return fail("They've already had the maximum number of reminders.");
  }
  const sent = await sendDraftReminder(draft.id, draft.remindersSent);
  if (!sent) return fail("No reminder sent: they've booked, or registration has closed.");
  await logAudit({
    action: "event_registration.remind",
    subject: "EventRegistration",
    subjectId: draft.id,
    actorId: session.user.id,
    meta: { eventId: draft.eventId },
  });
  revalidatePath(`/admin/content/events/${draft.eventId}`);
  return { success: true, data: undefined };
}

/** Admin: remove a draft (e.g. a duplicate or someone who isn't coming). */
export async function discardRegistrationDraft(draftId: string): Promise<Result> {
  const session = await requirePermission("delete", "EventRegistration");
  const draft = await prisma.eventRegistrationDraft
    .delete({ where: { id: String(draftId) }, select: { eventId: true } })
    .catch(() => null);
  if (!draft) return fail("That registration is no longer in progress.");
  await logAudit({
    action: "event_registration.discard_draft",
    subject: "EventRegistration",
    subjectId: String(draftId),
    actorId: session.user.id,
    meta: { eventId: draft.eventId },
  });
  revalidatePath(`/admin/content/events/${draft.eventId}`);
  return { success: true, data: undefined };
}

/**
 * Admin: delete a whole booking and its attendees. Bookings with money
 * against them are refused (deleting would orphan ledger incomes); finance
 * voids or refunds first. Open checkouts are settled first, and the delete
 * is guarded on amountPaid = 0 so a payment landing mid-delete is kept.
 */
export async function deleteEventRegistration(registrationId: string): Promise<Result> {
  const session = await requirePermission("delete", "EventRegistration");
  const reg = await prisma.eventRegistration.findUnique({
    where: { id: String(registrationId) },
    select: {
      id: true,
      status: true,
      amountPaid: true,
      eventId: true,
      registrant: { select: { fullName: true } },
      _count: { select: { attendees: true } },
    },
  });
  if (!reg) return fail("That booking no longer exists.");
  if (pesewas(reg.amountPaid) > 0) {
    return fail(
      `This booking has ${formatMoney(reg.amountPaid)} paid against it. Ask finance to void or refund the payment first.`,
    );
  }
  // A checkout may have completed since the page loaded.
  const open = await prisma.paymentIntent.findMany({
    where: { eventRegistrationId: reg.id, status: { in: ["PENDING", "PROCESSING"] } },
    select: { reference: true },
  });
  for (const i of open) await settlePaymentIntent(i.reference).catch(() => undefined);
  const { count } = await prisma.eventRegistration.deleteMany({
    where: { id: reg.id, amountPaid: 0 },
  });
  if (count === 0) return fail("This booking was just paid, so it was kept.");
  await logAudit({
    action: "event_registration.delete",
    subject: "EventRegistration",
    subjectId: reg.id,
    actorId: session.user.id,
    meta: {
      eventId: reg.eventId,
      status: reg.status,
      registrant: reg.registrant.fullName,
      attendees: reg._count.attendees,
    },
  });
  revalidatePath(`/admin/content/events/${reg.eventId}`);
  return { success: true, data: undefined };
}

/**
 * Cheap change signal for the admin event page's live bookings: polled every
 * ~20s, the page refreshes when it changes. Count catches cancellations,
 * latest catches new bookings.
 */
export async function bookingPulse(eventId: string) {
  await requirePermission("read", "EventRegistration");
  const where = { eventId, status: "CONFIRMED" as const };
  const [count, latest] = await Promise.all([
    prisma.eventRegistration.count({ where }),
    prisma.eventRegistration.findFirst({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        createdAt: true,
        registrant: { select: { fullName: true } },
        _count: { select: { attendees: true } },
      },
    }),
  ]);
  return {
    count,
    latest: latest && {
      at: latest.createdAt.toISOString(),
      by: latest.registrant.fullName,
      people: latest._count.attendees,
    },
  };
}
