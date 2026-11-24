import { log } from "./logger";
import { prisma } from "@/lib/database";
import type { RegistrationStep } from "@/app/generated/prisma/client";
import { getMessagingService } from "@/lib/messaging";
import { renderEmail } from "@/lib/email-templates/render";
import { BrandedTextEmail } from "@/lib/email-templates/BrandedTextEmail";
import { escapeHtml } from "@/lib/rich-text";
import { registerEmailUrl } from "@/lib/event-subdomain";
import { isRegistrationOpen } from "@/lib/event-registration";

/** Form steps in order; a draft stores the furthest one reached. */
export const STEP_ORDER: RegistrationStep[] = ["ACCOUNT", "YOU", "PEOPLE", "DETAILS", "REVIEW"];
export const STEP_LABEL: Record<RegistrationStep, string> = {
  ACCOUNT: "Sign-in email sent",
  YOU: "Your details",
  PEOPLE: "Who's coming",
  DETAILS: "Details",
  REVIEW: "Review",
};
export const furthest = (a: RegistrationStep, b: RegistrationStep) =>
  STEP_ORDER.indexOf(a) >= STEP_ORDER.indexOf(b) ? a : b;

/** Reminder rules: after a day idle, at most 2 (1 if they never opened the sign-in link), 3 days apart. */
export const REMIND_AFTER_MS = 24 * 3600_000;
export const REMIND_GAP_MS = 3 * 24 * 3600_000;
export const maxReminders = (emailVerified: boolean) => (emailVerified ? 2 : 1);

/** What the admin sees: the funnel plus everyone still part-way through. */
export async function getRegistrationProgress(eventId: string) {
  const drafts = await prisma.eventRegistrationDraft.findMany({
    where: { eventId },
    orderBy: { lastActiveAt: "desc" },
    select: {
      id: true,
      step: true,
      data: true,
      lastActiveAt: true,
      remindersSent: true,
      lastRemindedAt: true,
      completedAt: true,
      user: {
        select: { id: true, name: true, email: true, emailVerified: true, member: { select: { phone: true, fullName: true } } },
      },
    },
  });
  const reached = (s: RegistrationStep) =>
    drafts.filter((d) => d.completedAt || STEP_ORDER.indexOf(d.step) >= STEP_ORDER.indexOf(s)).length;
  const completed = drafts.filter((d) => d.completedAt);
  const funnel = {
    started: drafts.length,
    steps: STEP_ORDER.map((s) => ({ step: s, label: STEP_LABEL[s], count: reached(s) })),
    completed: completed.length,
    reminded: drafts.filter((d) => d.remindersSent > 0).length,
    completedAfterReminder: completed.filter((d) => d.remindersSent > 0).length,
  };
  const inProgress = drafts
    .filter((d) => !d.completedAt)
    .map((d) => {
      // `data` is client-shaped; read it defensively.
      const data = (d.data ?? {}) as { self?: { fullName?: unknown; phone?: unknown }; rows?: unknown };
      const typedName = typeof data.self?.fullName === "string" ? data.self.fullName.trim() : "";
      const typedPhone = typeof data.self?.phone === "string" ? data.self.phone.trim() : "";
      return {
        id: d.id,
        userId: d.user.id,
        name: typedName || d.user.member?.fullName || d.user.name,
        email: d.user.email,
        phone: d.user.member?.phone || typedPhone || null,
        step: d.step,
        stepLabel: STEP_LABEL[d.step],
        people: Array.isArray(data.rows) ? data.rows.length : 0,
        lastActiveAt: d.lastActiveAt,
        remindersSent: d.remindersSent,
        lastRemindedAt: d.lastRemindedAt,
        canRemind: d.remindersSent < maxReminders(d.user.emailVerified),
      };
    });
  return { funnel, inProgress };
}

export type RegistrationProgress = Awaited<ReturnType<typeof getRegistrationProgress>>;
export type DraftRow = RegistrationProgress["inProgress"][number];

/**
 * Email (and SMS when we have a phone) one "finish your registration" nudge.
 * Claims the reminder first (remindersSent must still be `expectedSent`) so
 * overlapping runs never send twice. Returns false when nothing was sent.
 */
export async function sendDraftReminder(draftId: string, expectedSent: number): Promise<boolean> {
  const draft = await prisma.eventRegistrationDraft.findUnique({
    where: { id: draftId },
    select: {
      data: true,
      completedAt: true,
      userId: true,
      user: { select: { name: true, email: true, member: { select: { id: true, phone: true, fullName: true } } } },
      event: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          registrationEnabled: true,
          registrationClosesAt: true,
          date: true,
        },
      },
    },
  });
  if (!draft || draft.completedAt || !isRegistrationOpen(draft.event)) return false;
  // Booked by someone else (e.g. a spouse put them on their booking): nothing to finish.
  if (draft.user.member) {
    const onBooking = await prisma.eventAttendee.findFirst({
      where: { eventId: draft.event.id, memberId: draft.user.member.id },
      select: { id: true },
    });
    if (onBooking) return false;
  }

  const { count } = await prisma.eventRegistrationDraft.updateMany({
    where: { id: draftId, remindersSent: expectedSent, completedAt: null },
    data: { remindersSent: { increment: 1 }, lastRemindedAt: new Date() },
  });
  if (count === 0) return false;

  const { event, user } = draft;
  const data = (draft.data ?? {}) as { self?: { phone?: unknown } };
  const phone = user.member?.phone || (typeof data.self?.phone === "string" ? data.self.phone.trim() : "");
  // Directory name over the Google profile name (e.g. "Alberta_Bertie Phanet").
  const first = (user.member?.fullName || user.name).trim().split(/\s+/)[0] || "there";
  const url = registerEmailUrl(event.slug);
  const closes = (event.registrationClosesAt ?? event.date).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Africa/Accra",
  });

  try {
    const htmlBody = `
      <p>Hi ${escapeHtml(first)},</p>
      <p>You started registering for <strong>${escapeHtml(event.title)}</strong> but haven't finished yet.
      Everything you filled in is saved, so it only takes a minute to complete.</p>
      <p><a href="${escapeHtml(url)}">Finish my registration</a></p>
      <p>Registration closes on ${escapeHtml(closes)}.</p>`;
    const { html, text } = await renderEmail(
      BrandedTextEmail({ preview: `Finish registering for ${event.title}`, htmlBody }),
    );
    const res = await getMessagingService("EMAIL").send({
      to: user.email,
      subject: `Finish your registration: ${event.title}`,
      body: html,
      text,
    });
    if (!res.ok) log.error("registration-drafts", "reminder email failed", { draftId, err: res.error });
    if (phone) {
      const sms = await getMessagingService("SMS").send({
        to: phone,
        body: `Hi ${first}, your ${event.title} registration isn't finished yet. Your answers are saved: ${url}`,
      });
      if (!sms.ok) log.error("registration-drafts", "reminder sms failed", { draftId, err: sms.error });
    }
  } catch (err) {
    log.error("registration-drafts", "reminder failed", { draftId, err });
  }
  return true;
}
