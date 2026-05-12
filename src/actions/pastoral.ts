"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { can, requireAuth, requirePermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import {
  followUpTaskCreateSchema,
  followUpTaskStatusSchema,
  followUpTaskUpdateSchema,
  idSchema,
  memberNoteCreateSchema,
  memberNoteUpdateSchema,
  visitationCreateSchema,
  visitationUpdateSchema,
  type FollowUpTaskCreateInput,
  type FollowUpTaskStatusInput,
  type FollowUpTaskUpdateInput,
  type MemberNoteCreateInput,
  type MemberNoteUpdateInput,
  type VisitationCreateInput,
  type VisitationUpdateInput,
} from "@/lib/schemas/pastoral.schema";

async function memberPolicyInstance(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, userId: true, units: { select: { unitId: true } } },
  });
  if (!member) throw new Error("Member not found");
  return {
    member,
    instance: {
      id: member.id,
      userId: member.userId,
      unitIds: member.units.map((unit) => unit.unitId),
    },
  };
}

function revalidateMember(memberId: string) {
  revalidatePath("/admin/tasks");
  revalidatePath(`/admin/members/${memberId}`);
}

function requireNotePermission(
  action: "read" | "create" | "update" | "delete",
  visibility: "PASTORAL" | "GENERAL",
) {
  return requirePermission(action, "Note", { visibility });
}

export async function getMemberPastoralCare(memberId: string) {
  const { instance } = await memberPolicyInstance(memberId);
  await requirePermission("read", "Member", instance);

  const [canReadVisits, canReadTasks, canReadPastoralNotes, canReadGeneralNotes] =
    await Promise.all([
      can("read", "Visitation", instance),
      can("read", "FollowUpTask", instance),
      can("read", "Note", { visibility: "PASTORAL" }),
      can("read", "Note", { visibility: "GENERAL" }),
    ]);

  const [visitations, tasks, notes] = await Promise.all([
    canReadVisits
      ? prisma.visitation.findMany({
          where: { memberId },
          orderBy: { visitedAt: "desc" },
          include: { visitedBy: { select: { id: true, name: true, email: true } } },
        })
      : [],
    canReadTasks
      ? prisma.followUpTask.findMany({
          where: { memberId },
          orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
          include: {
            assignedTo: { select: { id: true, name: true, email: true } },
            createdBy: { select: { id: true, name: true, email: true } },
          },
        })
      : [],
    canReadPastoralNotes || canReadGeneralNotes
      ? prisma.memberNote.findMany({
          where: {
            memberId,
            visibility: canReadPastoralNotes ? undefined : "GENERAL",
          },
          orderBy: { createdAt: "desc" },
          include: { author: { select: { id: true, name: true, email: true } } },
        })
      : [],
  ]);

  return {
    visitations,
    tasks,
    notes,
    permissions: {
      canCreateVisitation: await can("create", "Visitation", instance),
      canCreateTask: await can("create", "FollowUpTask", instance),
      canCreateGeneralNote: await can("create", "Note", { visibility: "GENERAL" }),
      canCreatePastoralNote: await can("create", "Note", {
        visibility: "PASTORAL",
      }),
      canReadPastoralNotes,
    },
  };
}

export async function listTaskAssignableUsers() {
  await requirePermission("read", "User");
  return prisma.user.findMany({
    where: {
      banned: { not: true },
      role: { not: null },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });
}

export async function getMyTasks() {
  const session = await requireAuth("/admin/login");
  await requirePermission("read", "FollowUpTask", {
    assignedToId: session.user.id,
  });
  return prisma.followUpTask.findMany({
    where: { assignedToId: session.user.id },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    include: {
      member: { select: { id: true, fullName: true, preferredName: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function createVisitation(input: VisitationCreateInput) {
  const data = visitationCreateSchema.parse(input);
  const session = await requirePermission(
    "create",
    "Visitation",
    (await memberPolicyInstance(data.memberId)).instance,
  );

  const visitation = await prisma.visitation.create({ data });
  await logAudit({
    action: "visitation.create",
    subject: "Visitation",
    subjectId: visitation.id,
    actorId: session.user.id,
    meta: { memberId: data.memberId },
  });
  revalidateMember(data.memberId);
  return { success: true, data: visitation };
}

export async function updateVisitation(input: VisitationUpdateInput) {
  const data = visitationUpdateSchema.parse(input);
  const session = await requirePermission(
    "update",
    "Visitation",
    (await memberPolicyInstance(data.memberId)).instance,
  );

  const visitation = await prisma.visitation.update({
    where: { id: data.id },
    data: {
      memberId: data.memberId,
      visitedById: data.visitedById,
      visitedAt: data.visitedAt,
      notes: data.notes,
    },
  });
  await logAudit({
    action: "visitation.update",
    subject: "Visitation",
    subjectId: visitation.id,
    actorId: session.user.id,
    meta: { memberId: data.memberId },
  });
  revalidateMember(data.memberId);
  return { success: true, data: visitation };
}

export async function deleteVisitation(id: string) {
  const parsedId = idSchema.parse(id);
  const current = await prisma.visitation.findUnique({
    where: { id: parsedId },
    select: { memberId: true },
  });
  if (!current) throw new Error("Visitation not found");
  const session = await requirePermission(
    "delete",
    "Visitation",
    (await memberPolicyInstance(current.memberId)).instance,
  );
  await prisma.visitation.delete({ where: { id: parsedId } });
  await logAudit({
    action: "visitation.delete",
    subject: "Visitation",
    subjectId: parsedId,
    actorId: session.user.id,
    meta: { memberId: current.memberId },
  });
  revalidateMember(current.memberId);
  return { success: true };
}

export async function createFollowUpTask(input: FollowUpTaskCreateInput) {
  const data = followUpTaskCreateSchema.parse(input);
  const session = await requirePermission("create", "FollowUpTask", {
    ...(await memberPolicyInstance(data.memberId)).instance,
    assignedToId: data.assignedToId,
  });

  const task = await prisma.followUpTask.create({
    data: { ...data, createdById: session.user.id },
  });
  await logAudit({
    action: "follow_up_task.create",
    subject: "FollowUpTask",
    subjectId: task.id,
    actorId: session.user.id,
    meta: { memberId: data.memberId, assignedToId: data.assignedToId },
  });
  revalidateMember(data.memberId);
  return { success: true, data: task };
}

export async function updateFollowUpTask(input: FollowUpTaskUpdateInput) {
  const data = followUpTaskUpdateSchema.parse(input);
  const session = await requirePermission("update", "FollowUpTask", {
    ...(await memberPolicyInstance(data.memberId)).instance,
    assignedToId: data.assignedToId,
  });

  const task = await prisma.followUpTask.update({
    where: { id: data.id },
    data: {
      memberId: data.memberId,
      assignedToId: data.assignedToId,
      title: data.title,
      notes: data.notes,
      dueAt: data.dueAt,
      status: data.status,
    },
  });
  await logAudit({
    action: "follow_up_task.update",
    subject: "FollowUpTask",
    subjectId: task.id,
    actorId: session.user.id,
    meta: { memberId: data.memberId, assignedToId: data.assignedToId },
  });
  revalidateMember(data.memberId);
  return { success: true, data: task };
}

export async function updateFollowUpTaskStatus(input: FollowUpTaskStatusInput) {
  const data = followUpTaskStatusSchema.parse(input);
  const current = await prisma.followUpTask.findUnique({
    where: { id: data.id },
    select: { memberId: true, assignedToId: true },
  });
  if (!current) throw new Error("Task not found");
  const session = await requirePermission("update", "FollowUpTask", {
    ...(await memberPolicyInstance(current.memberId)).instance,
    assignedToId: current.assignedToId,
  });
  const task = await prisma.followUpTask.update({
    where: { id: data.id },
    data: { status: data.status },
  });
  await logAudit({
    action: "follow_up_task.status",
    subject: "FollowUpTask",
    subjectId: task.id,
    actorId: session.user.id,
    meta: { status: data.status },
  });
  revalidateMember(current.memberId);
  return { success: true, data: task };
}

export async function deleteFollowUpTask(id: string) {
  const parsedId = idSchema.parse(id);
  const current = await prisma.followUpTask.findUnique({
    where: { id: parsedId },
    select: { memberId: true, assignedToId: true },
  });
  if (!current) throw new Error("Task not found");
  const session = await requirePermission("delete", "FollowUpTask", {
    ...(await memberPolicyInstance(current.memberId)).instance,
    assignedToId: current.assignedToId,
  });
  await prisma.followUpTask.delete({ where: { id: parsedId } });
  await logAudit({
    action: "follow_up_task.delete",
    subject: "FollowUpTask",
    subjectId: parsedId,
    actorId: session.user.id,
    meta: { memberId: current.memberId },
  });
  revalidateMember(current.memberId);
  return { success: true };
}

export async function createMemberNote(input: MemberNoteCreateInput) {
  const data = memberNoteCreateSchema.parse(input);
  const session = await requireNotePermission("create", data.visibility);
  await requirePermission("read", "Member", (await memberPolicyInstance(data.memberId)).instance);

  const note = await prisma.memberNote.create({
    data: { ...data, authorId: session.user.id },
  });
  await logAudit({
    action: "member_note.create",
    subject: "Note",
    subjectId: note.id,
    actorId: session.user.id,
    meta: { memberId: data.memberId, visibility: data.visibility },
  });
  revalidateMember(data.memberId);
  return { success: true, data: note };
}

export async function updateMemberNote(input: MemberNoteUpdateInput) {
  const data = memberNoteUpdateSchema.parse(input);
  const current = await prisma.memberNote.findUnique({
    where: { id: data.id },
    select: { memberId: true, visibility: true },
  });
  if (!current) throw new Error("Note not found");
  const session = await requireNotePermission("update", current.visibility);
  await requireNotePermission("update", data.visibility);

  const note = await prisma.memberNote.update({
    where: { id: data.id },
    data: { body: data.body, visibility: data.visibility },
  });
  await logAudit({
    action: "member_note.update",
    subject: "Note",
    subjectId: note.id,
    actorId: session.user.id,
    meta: { memberId: current.memberId, visibility: data.visibility },
  });
  revalidateMember(current.memberId);
  return { success: true, data: note };
}

export async function deleteMemberNote(id: string) {
  const parsedId = idSchema.parse(id);
  const current = await prisma.memberNote.findUnique({
    where: { id: parsedId },
    select: { memberId: true, visibility: true },
  });
  if (!current) throw new Error("Note not found");
  const session = await requireNotePermission("delete", current.visibility);
  await prisma.memberNote.delete({ where: { id: parsedId } });
  await logAudit({
    action: "member_note.delete",
    subject: "Note",
    subjectId: parsedId,
    actorId: session.user.id,
    meta: { memberId: current.memberId, visibility: current.visibility },
  });
  revalidateMember(current.memberId);
  return { success: true };
}
