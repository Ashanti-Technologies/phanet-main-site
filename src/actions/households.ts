"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { requirePermission } from "@/lib/auth-guard";
import {
  householdCreateSchema,
  householdUpdateSchema,
  type HouseholdCreateInput,
  type HouseholdUpdateInput,
} from "@/lib/schemas/member.schema";
import { logAudit } from "@/lib/audit";

export async function listHouseholds() {
  await requirePermission("read", "Household");
  return prisma.household.findMany({
    orderBy: { name: "asc" },
    include: {
      members: { select: { id: true, fullName: true, photoUrl: true } },
    },
  });
}

export async function getHouseholdById(id: string) {
  await requirePermission("read", "Household");
  return prisma.household.findUnique({
    where: { id },
    include: {
      members: {
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true, photoUrl: true, status: true },
      },
    },
  });
}

export async function createHousehold(input: HouseholdCreateInput) {
  const session = await requirePermission("create", "Household");
  const data = householdCreateSchema.parse(input);
  const household = await prisma.household.create({ data });
  await logAudit({
    action: "household.create",
    subject: "Household",
    subjectId: household.id,
    actorId: session.user.id,
  });
  revalidatePath("/admin/members/households");
  return { success: true, data: household };
}

export async function updateHousehold(input: HouseholdUpdateInput) {
  const session = await requirePermission("update", "Household");
  const data = householdUpdateSchema.parse(input);
  const household = await prisma.household.update({
    where: { id: data.id },
    data: {
      name: data.name,
      addressLine: data.addressLine,
      city: data.city,
      region: data.region,
      notes: data.notes,
    },
  });
  await logAudit({
    action: "household.update",
    subject: "Household",
    subjectId: household.id,
    actorId: session.user.id,
  });
  revalidatePath("/admin/members/households");
  revalidatePath(`/admin/members/households/${household.id}`);
  return { success: true, data: household };
}

export async function deleteHousehold(id: string) {
  const session = await requirePermission("delete", "Household");
  await prisma.household.delete({ where: { id } });
  await logAudit({
    action: "household.delete",
    subject: "Household",
    subjectId: id,
    actorId: session.user.id,
  });
  revalidatePath("/admin/members/households");
  return { success: true };
}

export async function assignMemberToHousehold(memberId: string, householdId: string | null) {
  const session = await requirePermission("update", "Member");
  const member = await prisma.member.update({
    where: { id: memberId },
    data: { householdId },
  });
  await logAudit({
    action: "member.assign_household",
    subject: "Member",
    subjectId: memberId,
    actorId: session.user.id,
    meta: { householdId },
  });
  revalidatePath("/admin/members/households");
  revalidatePath(`/admin/members/${memberId}`);
  return { success: true, data: member };
}
