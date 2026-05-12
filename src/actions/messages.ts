"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/database";
import { requirePermission } from "@/lib/auth-guard";
import { getMessagingService } from "@/lib/messaging";
import { renderTemplate } from "@/lib/messaging/utils";
import { logAudit } from "@/lib/audit";
import {
  batchCreateSchema,
  templateCreateSchema,
  templateUpdateSchema,
  type BatchCreateInput,
  type SegmentInput,
  type TemplateCreateInput,
  type TemplateUpdateInput,
} from "@/lib/schemas/message.schema";

// ------------------------------ Templates ------------------------------

export async function listTemplates() {
  await requirePermission("read", "MessageTemplate");
  return prisma.messageTemplate.findMany({ orderBy: { name: "asc" } });
}

export async function getTemplate(id: string) {
  await requirePermission("read", "MessageTemplate");
  return prisma.messageTemplate.findUnique({ where: { id } });
}

export async function createTemplate(input: TemplateCreateInput) {
  const session = await requirePermission("create", "MessageTemplate");
  const data = templateCreateSchema.parse(input);
  const tpl = await prisma.messageTemplate.create({
    data: {
      name: data.name,
      channel: data.channel,
      subject: data.subject ?? null,
      body: data.body,
      variables: data.variables,
    },
  });
  await logAudit({
    action: "messageTemplate.create",
    subject: "MessageTemplate",
    subjectId: tpl.id,
    actorId: session.user.id,
  });
  revalidatePath("/admin/messages/templates");
  return { success: true, data: tpl };
}

export async function updateTemplate(input: TemplateUpdateInput) {
  const session = await requirePermission("update", "MessageTemplate");
  const data = templateUpdateSchema.parse(input);
  const tpl = await prisma.messageTemplate.update({
    where: { id: data.id },
    data: {
      name: data.name,
      channel: data.channel,
      subject: data.subject ?? null,
      body: data.body,
      variables: data.variables,
    },
  });
  await logAudit({
    action: "messageTemplate.update",
    subject: "MessageTemplate",
    subjectId: tpl.id,
    actorId: session.user.id,
  });
  revalidatePath("/admin/messages/templates");
  revalidatePath(`/admin/messages/templates/${tpl.id}`);
  return { success: true, data: tpl };
}

export async function deleteTemplate(id: string) {
  const session = await requirePermission("delete", "MessageTemplate");
  await prisma.messageTemplate.delete({ where: { id } });
  await logAudit({
    action: "messageTemplate.delete",
    subject: "MessageTemplate",
    subjectId: id,
    actorId: session.user.id,
  });
  revalidatePath("/admin/messages/templates");
  return { success: true };
}

// ------------------------------ Segments ------------------------------

function ageBucketRange(bucket: SegmentInput["ageBucket"]) {
  if (!bucket) return undefined;
  const now = new Date();
  const y = (n: number) =>
    new Date(now.getFullYear() - n, now.getMonth(), now.getDate());
  switch (bucket) {
    case "under18":
      return { gte: y(18) };
    case "18-29":
      return { gte: y(30), lt: y(18) };
    case "30-49":
      return { gte: y(50), lt: y(30) };
    case "50-69":
      return { gte: y(70), lt: y(50) };
    case "70plus":
      return { lt: y(70) };
  }
}

function segmentWhere(
  segment: SegmentInput,
  channel: "EMAIL" | "SMS",
): Prisma.MemberWhereInput {
  const where: Prisma.MemberWhereInput = {};
  if (segment.q) {
    where.OR = [
      { fullName: { contains: segment.q, mode: "insensitive" } },
      { preferredName: { contains: segment.q, mode: "insensitive" } },
      { email: { contains: segment.q, mode: "insensitive" } },
      { phone: { contains: segment.q } },
    ];
  }
  if (segment.status) where.status = segment.status;
  if (segment.unitId) where.units = { some: { unitId: segment.unitId } };
  if (segment.tagId) where.tags = { some: { tagId: segment.tagId } };
  const dob = ageBucketRange(segment.ageBucket);
  if (dob) where.dob = dob;

  if (channel === "EMAIL") {
    where.email = { ...((where.email as object) ?? {}), not: null };
    if (segment.respectPreferences) where.notifyByEmail = true;
  } else {
    where.phone = { ...((where.phone as object) ?? {}), not: null };
    if (segment.respectPreferences) where.notifyBySms = true;
  }
  return where;
}

export async function resolveSegment(
  segment: SegmentInput,
  channel: "EMAIL" | "SMS",
) {
  await requirePermission("read", "Member");
  const where = segmentWhere(segment, channel);
  const [count, sample] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      take: 5,
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        preferredName: true,
        email: true,
        phone: true,
      },
    }),
  ]);
  return { count, sample };
}

// ------------------------------ Batches ------------------------------

export async function listBatches() {
  await requirePermission("read", "MessageBatch");
  return prisma.messageBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getBatch(id: string) {
  await requirePermission("read", "MessageBatch");
  return prisma.messageBatch.findUnique({
    where: { id },
    include: {
      logs: { orderBy: { createdAt: "desc" }, take: 1000 },
      template: { select: { id: true, name: true } },
    },
  });
}

/**
 * Create a batch, resolve the segment, render per-recipient bodies, and send.
 * Runs synchronously — for very large segments break into multiple batches.
 */
export async function sendBatch(input: BatchCreateInput) {
  const session = await requirePermission("send", "Message");
  const data = batchCreateSchema.parse(input);

  const where = segmentWhere(data.segment, data.channel);
  const recipients = await prisma.member.findMany({
    where,
    select: {
      id: true,
      fullName: true,
      preferredName: true,
      email: true,
      phone: true,
      units: {
        select: { unit: { select: { name: true } } },
        take: 1,
      },
    },
  });

  if (recipients.length === 0) {
    throw new Error("Segment produced no recipients.");
  }

  const batch = await prisma.messageBatch.create({
    data: {
      name: data.name,
      channel: data.channel,
      templateId: data.templateId || null,
      subject: data.subject ?? null,
      body: data.body,
      segmentJson: data.segment as unknown as Prisma.InputJsonValue,
      recipients: recipients.length,
      status: "SENDING",
      startedAt: new Date(),
      createdById: session.user.id,
    },
  });

  const service = getMessagingService(data.channel);

  // Render and dispatch in chunks.
  const CHUNK = 50;
  let successes = 0;
  let failures = 0;

  for (let i = 0; i < recipients.length; i += CHUNK) {
    const slice = recipients.slice(i, i + CHUNK);
    const tasks = slice.map(async (m) => {
      const to = data.channel === "EMAIL" ? m.email : m.phone;
      if (!to) {
        await prisma.messageLog.create({
          data: {
            batchId: batch.id,
            memberId: m.id,
            channel: data.channel,
            recipient: "",
            status: "FAILED",
            error: "No recipient address",
          },
        });
        failures += 1;
        return;
      }
      const vars = {
        firstName: (m.preferredName ?? m.fullName).split(" ")[0] ?? "",
        fullName: m.fullName,
        preferredName: m.preferredName ?? m.fullName,
        unitName: m.units[0]?.unit.name ?? "",
      };
      const body = renderTemplate(data.body, vars);
      const subject = data.subject
        ? renderTemplate(data.subject, vars)
        : undefined;
      const res = await service.send({ to, subject, body });
      await prisma.messageLog.create({
        data: {
          batchId: batch.id,
          memberId: m.id,
          channel: data.channel,
          recipient: to,
          status: res.ok ? "SENT" : "FAILED",
          providerRef: res.providerRef,
          error: res.error,
          sentAt: res.ok ? new Date() : undefined,
        },
      });
      if (res.ok) successes += 1;
      else failures += 1;
    });
    await Promise.all(tasks);
  }

  const status: "SENT" | "PARTIAL" | "FAILED" =
    failures === 0 ? "SENT" : successes === 0 ? "FAILED" : "PARTIAL";

  const finished = await prisma.messageBatch.update({
    where: { id: batch.id },
    data: {
      status,
      successes,
      failures,
      finishedAt: new Date(),
    },
  });

  await logAudit({
    action: "message.send_batch",
    subject: "MessageBatch",
    subjectId: batch.id,
    meta: {
      channel: data.channel,
      recipients: recipients.length,
      successes,
      failures,
    },
    actorId: session.user.id,
  });

  revalidatePath("/admin/messages/batches");
  return finished;
}
