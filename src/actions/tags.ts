"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { requirePermission } from "@/lib/auth-guard";
import {
  tagCreateSchema,
  tagUpdateSchema,
  type TagCreateInput,
  type TagUpdateInput,
} from "@/lib/schemas/member.schema";
import { logAudit } from "@/lib/audit";

export async function listTags() {
  await requirePermission("read", "Tag");
  return prisma.tag.findMany({
    orderBy: { label: "asc" },
    include: { _count: { select: { members: true } } },
  });
}

export async function createTag(input: TagCreateInput) {
  const session = await requirePermission("create", "Tag");
  const data = tagCreateSchema.parse(input);
  const tag = await prisma.tag.create({ data });
  await logAudit({
    action: "tag.create",
    subject: "Tag",
    subjectId: tag.id,
    actorId: session.user.id,
  });
  revalidatePath("/admin/settings/tags");
  return { success: true, data: tag };
}

export async function updateTag(input: TagUpdateInput) {
  const session = await requirePermission("update", "Tag");
  const data = tagUpdateSchema.parse(input);
  const tag = await prisma.tag.update({
    where: { id: data.id },
    data: { label: data.label, color: data.color },
  });
  await logAudit({
    action: "tag.update",
    subject: "Tag",
    subjectId: tag.id,
    actorId: session.user.id,
  });
  revalidatePath("/admin/settings/tags");
  return { success: true, data: tag };
}

export async function deleteTag(id: string) {
  const session = await requirePermission("delete", "Tag");
  await prisma.tag.delete({ where: { id } });
  await logAudit({
    action: "tag.delete",
    subject: "Tag",
    subjectId: id,
    actorId: session.user.id,
  });
  revalidatePath("/admin/settings/tags");
  return { success: true };
}
