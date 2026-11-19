import { log } from "./logger";
import { prisma } from "@/lib/database";
import { getMessagingService } from "@/lib/messaging";
import { renderEmail } from "@/lib/email-templates/render";
import { BrandedTextEmail } from "@/lib/email-templates/BrandedTextEmail";
import { escapeHtml } from "@/lib/rich-text";
import { registerEmailUrl } from "@/lib/event-subdomain";
import { buildEventIcs, googleCalendarUrl, icsUrl } from "@/lib/event-calendar";
import { formatMoney } from "@/lib/format";
import { balanceMinor, chargesFees, pesewas } from "@/lib/event-fees";

/**
 * Booking confirmation, with fees when the event charges them. Lives outside
 * "use server" files so payment settlement can send it too. Never throws.
 */
export async function sendRegistrationConfirmation({
  registrationId,
  updated,
  to,
}: {
  registrationId: string;
  updated: boolean;
  /** Defaults to the registrant's email. */
  to?: string | null;
}) {
  try {
    const reg = await prisma.eventRegistration.findUnique({
      where: { id: registrationId },
      select: {
        amountDue: true,
        amountPaid: true,
        registrant: { select: { email: true } },
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            date: true,
            endDate: true,
            time: true,
            location: true,
            address: true,
            calendarReminders: true,
            paymentMode: true,
          },
        },
        attendees: {
          orderBy: { createdAt: "asc" },
          select: { tierName: true, amount: true, attendance: true, member: { select: { fullName: true } } },
        },
      },
    });
    const recipient = to ?? reg?.registrant.email;
    if (!reg || !recipient) return;
    const { event } = reg;

    const charges = chargesFees(event.paymentMode) && pesewas(reg.amountDue) > 0;
    const people = reg.attendees
      .map((a) => {
        const fee = charges && a.tierName ? ` — ${escapeHtml(a.tierName)} · ${formatMoney(a.amount ?? 0)}` : "";
        const online = a.attendance === "ONLINE" ? " (online)" : "";
        return `<li>${escapeHtml(a.member.fullName)}${online}${fee}</li>`;
      })
      .join("");
    const streams = reg.attendees.some((a) => a.attendance === "ONLINE")
      ? "<p>We'll send the stream links for following online before each session.</p>"
      : "";
    const balance = balanceMinor(reg.amountDue, reg.amountPaid) / 100;
    const fees = !charges
      ? ""
      : `<p><strong>Total: ${formatMoney(reg.amountDue)}</strong><br>${
          balance === 0
            ? `Paid in full (${formatMoney(reg.amountPaid)}). Thank you!`
            : event.paymentMode === "PAY_AT_EVENT"
              ? `${formatMoney(balance)} to pay at the event.`
              : `${formatMoney(balance)} still to pay. Use the link below to complete payment.`
        }</p>`;

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
      <ul>${people}</ul>
      ${streams}
      ${fees}
      <p><strong>Add it to your calendar:</strong><br>
      <a href="${escapeHtml(googleCalendarUrl(event))}">Google Calendar</a> ·
      <a href="${escapeHtml(icsUrl(event))}">Apple / Outlook (.ics)</a><br>
      The .ics file is also attached${event.calendarReminders.length ? " and includes reminders" : ""}.</p>
      <p>You can view or change your registration until registration closes:<br>
      <a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`;
    const { html, text } = await renderEmail(
      BrandedTextEmail({ preview: `Registration confirmed: ${event.title}`, htmlBody }),
    );
    const result = await getMessagingService("EMAIL").send({
      to: recipient,
      subject: `${updated ? "Registration updated" : "You're registered"}: ${event.title}`,
      body: html,
      text,
      attachments: [
        {
          filename: `${event.slug}.ics`,
          content: Buffer.from(buildEventIcs(event)),
          contentType: "text/calendar; charset=utf-8; method=PUBLISH",
        },
      ],
    });
    if (!result.ok) log.error("event-registration", "email failed", { err: result.error });
  } catch (err) {
    // Never fail a saved registration because the email didn't go out.
    log.error("event-registration", "email failed", { err });
  }
}
