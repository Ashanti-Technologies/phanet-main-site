import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/database";
import { getMessagingService } from "@/lib/messaging";
import { renderTemplate } from "@/lib/messaging/utils";

const BIRTHDAY_TEMPLATE_NAME = "birthday_default";

/**
 * Fires daily (Vercel cron). Sends today's birthday greeting via the
 * `birthday_default` MessageTemplate. Skips if the template is missing or
 * if there are no birthdays today.
 *
 * Auth: requires `Authorization: Bearer <CRON_SECRET>` header.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const template = await prisma.messageTemplate.findUnique({
    where: { name: BIRTHDAY_TEMPLATE_NAME },
  });
  if (!template) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      reason: `No template named "${BIRTHDAY_TEMPLATE_NAME}" configured.`,
    });
  }

  // Today (server timezone is UTC; PHANET ops in Africa/Accra which is UTC).
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();

  type Row = {
    id: string;
    fullName: string;
    preferredName: string | null;
    email: string | null;
    phone: string | null;
    notifyByEmail: boolean;
    notifyBySms: boolean;
    unit_name: string | null;
  };

  // Find a system actor to attribute the auto-generated batch to (first user
  // with any admin role). The cron will no-op if no admin exists.
  const systemActor = await prisma.user.findFirst({
    where: { role: { not: null } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!systemActor) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      reason: "No admin user available to attribute the batch to.",
    });
  }

  const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
    SELECT m.id, m."fullName", m."preferredName", m.email, m.phone,
           m."notifyByEmail", m."notifyBySms",
           (SELECT cu.name FROM church_unit_option cu
            JOIN member_unit mu ON mu."unitId" = cu.id
            WHERE mu."memberId" = m.id LIMIT 1) AS unit_name
    FROM member m
    WHERE m.dob IS NOT NULL
      AND EXTRACT(MONTH FROM m.dob)::int = ${month}
      AND EXTRACT(DAY FROM m.dob)::int = ${day}
      AND m.status NOT IN ('DECEASED','TRANSFERRED','INACTIVE');
  `);

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, channel: template.channel });
  }

  const service = getMessagingService(template.channel);

  const batch = await prisma.messageBatch.create({
    data: {
      name: `Birthday greetings — ${now.toISOString().slice(0, 10)}`,
      channel: template.channel,
      templateId: template.id,
      subject: template.subject ?? null,
      body: template.body,
      segmentJson: { type: "birthday-cron" } as unknown as Prisma.InputJsonValue,
      recipients: rows.length,
      status: "SENDING",
      startedAt: new Date(),
      createdById: systemActor.id,
    },
  });

  let successes = 0;
  let failures = 0;

  for (const m of rows) {
    const to = template.channel === "EMAIL" ? m.email : m.phone;
    const preference =
      template.channel === "EMAIL" ? m.notifyByEmail : m.notifyBySms;
    if (!to || !preference) {
      await prisma.messageLog.create({
        data: {
          batchId: batch.id,
          memberId: m.id,
          channel: template.channel,
          recipient: to ?? "",
          status: "FAILED",
          error: !to ? "No recipient address" : "Opted out",
        },
      });
      failures += 1;
      continue;
    }
    const vars = {
      firstName: (m.preferredName ?? m.fullName).split(" ")[0] ?? "",
      fullName: m.fullName,
      preferredName: m.preferredName ?? m.fullName,
      unitName: m.unit_name ?? "",
    };
    const body = renderTemplate(template.body, vars);
    const subject = template.subject
      ? renderTemplate(template.subject, vars)
      : undefined;
    const res = await service.send({ to, subject, body });
    await prisma.messageLog.create({
      data: {
        batchId: batch.id,
        memberId: m.id,
        channel: template.channel,
        recipient: to,
        status: res.ok ? "SENT" : "FAILED",
        providerRef: res.providerRef,
        error: res.error,
        sentAt: res.ok ? new Date() : undefined,
      },
    });
    if (res.ok) successes += 1;
    else failures += 1;
  }

  await prisma.messageBatch.update({
    where: { id: batch.id },
    data: {
      status:
        failures === 0 ? "SENT" : successes === 0 ? "FAILED" : "PARTIAL",
      successes,
      failures,
      finishedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    channel: template.channel,
    recipients: rows.length,
    successes,
    failures,
    batchId: batch.id,
  });
}
