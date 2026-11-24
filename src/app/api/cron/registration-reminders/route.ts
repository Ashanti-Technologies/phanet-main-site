import { log } from "@/lib/logger";
import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/database";
import {
  maxReminders,
  REMIND_AFTER_MS,
  REMIND_GAP_MS,
  sendDraftReminder,
} from "@/lib/registration-drafts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily (Vercel cron): nudge people who started an event registration but
 * haven't touched it for a day (rules in src/lib/registration-drafts.ts), and
 * clear saved answers once an event is over.
 *
 * Auth: requires `Authorization: Bearer <CRON_SECRET>` header.
 */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const due = await prisma.eventRegistrationDraft.findMany({
    where: {
      completedAt: null,
      lastActiveAt: { lte: new Date(now - REMIND_AFTER_MS) },
      remindersSent: { lt: maxReminders(true) },
      OR: [{ lastRemindedAt: null }, { lastRemindedAt: { lte: new Date(now - REMIND_GAP_MS) } }],
      event: { status: "PUBLISHED", registrationEnabled: true },
    },
    select: { id: true, remindersSent: true, user: { select: { emailVerified: true } } },
    // ponytail: 200 per run, sent one by one; batch if events outgrow it.
    take: 200,
  });

  let sent = 0;
  for (const d of due) {
    if (d.remindersSent >= maxReminders(d.user.emailVerified)) continue;
    try {
      if (await sendDraftReminder(d.id, d.remindersSent)) sent++;
    } catch (err) {
      log.error("registration-drafts", "reminder run failed", { draftId: d.id, err });
    }
  }

  // Saved answers include family contact details: drop them a day after the event.
  const over = new Date(now - 24 * 3600_000);
  const cleared = await prisma.eventRegistrationDraft.updateMany({
    where: {
      data: { not: Prisma.DbNull },
      event: { OR: [{ endDate: { lt: over } }, { endDate: null, date: { lt: over } }] },
    },
    data: { data: Prisma.DbNull },
  });

  log.info("registration-drafts", "reminder run", { due: due.length, sent, cleared: cleared.count });
  return NextResponse.json({ ok: true, due: due.length, sent, cleared: cleared.count });
}
