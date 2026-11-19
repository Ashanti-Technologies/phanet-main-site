"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/database";
import { auth, getServerAuthSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth-guard";
import { ROLES, serializeRoles } from "@/lib/rbac/roles";
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
import { settlePaymentIntent } from "@/lib/payments/settle";
import {
  createEventAccountSchema,
  parseRegistrationFields,
  registrationSubmitSchema,
  validateAnswers,
  type Answers,
  type RegistrationSubmitInput,
  eventPaymentInputSchema,
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
): Promise<Result<{ registrationId: string; payUrl?: string; paymentError?: string }>> {
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
    relationship: "SELF" | "SPOUSE" | "CHILD" | "GUEST";
    ageGroup?: "ADULT" | "TEEN" | "CHILD" | "INFANT";
    priceTierId?: string;
    answers: Answers;
  };
  const resolved: Resolved[] = [];
  for (const a of data.attendees) {
    const answers = validateAnswers(fields, "person", a.answers);
    if (!answers.ok) return fail(answers.error);
    const base = { ageGroup: a.ageGroup, priceTierId: a.priceTierId, answers: answers.value };
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
  if (charges && resolved.some((r) => !r.priceTierId)) {
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
          answers: r.answers,
          priceTierId: p.priceTierId,
          tierName: p.tierName,
          amount: charges ? money(p.amountMinor) : null,
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

      await syncRegistrationPayment(tx, registration.id);
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
    actorId: session.user.id,
    meta: { eventId: event.id, attendees: resolved.length },
  });

  if (status === "CONFIRMED") {
    await sendRegistrationConfirmation({
      registrationId,
      updated: !!existing,
      to: me!.email ?? session.user.email,
    });
  }

  revalidatePath("/me");
  revalidatePath(`/events/${event.slug}/register`);
  revalidatePath(`/admin/content/events/${event.id}`);

  if (event.paymentMode === "ONLINE" && owes) {
    const pay = await beginPayment(registrationId, session.user.email);
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
    console.error("[event-registration] checkout failed", err);
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
  const session = await requirePermission("update", "Member");
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

/** Clear an abandoned online booking so the people on it can book again. */
export async function cancelPendingRegistration(registrationId: string): Promise<Result> {
  const session = await requirePermission("update", "Member");
  const reg = await prisma.eventRegistration.findUnique({
    where: { id: String(registrationId) },
    select: { id: true, status: true, amountPaid: true, eventId: true },
  });
  if (!reg || reg.status !== "PENDING_PAYMENT") return fail("Only bookings awaiting payment can be cleared here.");
  if (pesewas(reg.amountPaid) > 0) return fail("This booking has a payment against it — ask finance to review it.");
  // A checkout may have completed since the page loaded.
  const open = await prisma.paymentIntent.findMany({
    where: { eventRegistrationId: reg.id, status: { in: ["PENDING", "PROCESSING"] } },
    select: { reference: true },
  });
  for (const i of open) await settlePaymentIntent(i.reference).catch(() => undefined);
  const { count } = await prisma.eventRegistration.deleteMany({
    where: { id: reg.id, status: "PENDING_PAYMENT", amountPaid: 0 },
  });
  if (count === 0) return fail("This booking was just paid, so it was kept.");
  await logAudit({
    action: "event_registration.clear_pending",
    subject: "EventRegistration",
    subjectId: reg.id,
    actorId: session.user.id,
    meta: { eventId: reg.eventId },
  });
  revalidatePath(`/admin/content/events/${reg.eventId}`);
  return { success: true, data: undefined };
}
