import { NextResponse } from "next/server";
import { prisma } from "@/lib/database";
import { log } from "@/lib/logger";
import { getMessagingService } from "@/lib/messaging";
import { renderEmail } from "@/lib/email-templates/render";
import { BrandedTextEmail } from "@/lib/email-templates/BrandedTextEmail";
import { escapeHtml } from "@/lib/rich-text";
import { YOUTUBE_LIVE_URL } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Sunday afternoons (Vercel cron): remind guests who planned their first
 * Elim Hour on /new-here that it starts tonight. Each guest is claimed
 * (remindedAt set) before sending, so a re-run never double-texts.
 *
 * Auth: requires `Authorization: Bearer <CRON_SECRET>` header.
 */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = await prisma.guest.findMany({
    where: { remindedAt: null, plannedFor: { gt: now, lte: new Date(now.getTime() + 24 * 3600_000) } },
    select: {
      id: true,
      plannedFor: true,
      member: { select: { fullName: true, email: true, phone: true, notifyByEmail: true, notifyBySms: true } },
    },
    // ponytail: 300 per run, sent one by one; batch if Sunday sign-ups outgrow it.
    take: 300,
  });

  let sent = 0;
  for (const g of due) {
    const { count } = await prisma.guest.updateMany({
      where: { id: g.id, remindedAt: null },
      data: { remindedAt: new Date() },
    });
    if (count === 0) continue;

    const first = g.member.fullName.trim().split(/\s+/)[0] || "there";
    const time = g.plannedFor.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
    try {
      if (g.member.email && g.member.notifyByEmail) {
        const { html, text } = await renderEmail(
          BrandedTextEmail({
            preview: `Elim Hour starts tonight at ${time} GMT`,
            htmlBody: `
              <p>Hi ${escapeHtml(first)},</p>
              <p>We're so glad you're joining us. <strong>Elim Hour starts tonight at ${time} GMT</strong>
              and runs for about 90 minutes: worship, a message from the Word, and intercession together.</p>
              <p><a href="${YOUTUBE_LIVE_URL}">Watch live on YouTube</a> (no account needed).</p>
              <p>See you there,<br/>The PHANET family</p>`,
          }),
        );
        const res = await getMessagingService("EMAIL").send({
          to: g.member.email,
          subject: "See you at Elim Hour tonight",
          body: html,
          text,
        });
        if (!res.ok) log.error("guests", "reminder email failed", { guestId: g.id, err: res.error });
      }
      if (g.member.phone && g.member.notifyBySms) {
        const res = await getMessagingService("SMS").send({
          to: g.member.phone,
          body: `Hi ${first}, Elim Hour starts tonight at ${time} GMT. Watch live on YouTube: ${YOUTUBE_LIVE_URL} - We're glad you're joining us! PHANET`,
        });
        if (!res.ok) log.error("guests", "reminder sms failed", { guestId: g.id, err: res.error });
      }
      sent++;
    } catch (err) {
      log.error("guests", "reminder failed", { guestId: g.id, err });
    }
  }

  log.info("guests", "reminder run", { due: due.length, sent });
  return NextResponse.json({ ok: true, due: due.length, sent });
}
