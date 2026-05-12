"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { requirePermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import {
  memberApplicationSchema,
  memberApprovalSchema,
  type MemberApplicationInput,
  type MemberApprovalInput,
} from "@/lib/schemas/self-service.schema";

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

export async function submitMembershipApplication(input: MemberApplicationInput) {
  const data = memberApplicationSchema.parse(input);
  const phone = normalizePhone(data.phone);

  const duplicate = await prisma.member.findFirst({
    where: {
      OR: [{ email: data.email }, { phone }],
      status: { in: ["PENDING_APPROVAL", "REGULAR", "MEMBER"] },
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new Error("An application or member record already exists for you");
  }

  const member = await prisma.member.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      phone,
      status: "PENDING_APPROVAL",
      notes: `Application intro:\n${data.intro}`,
      units: data.unitId ? { create: [{ unitId: data.unitId }] } : undefined,
    },
  });

  revalidatePath("/admin/members");
  return { success: true, data: { id: member.id } };
}

export async function approveMemberApplication(input: MemberApprovalInput) {
  const data = memberApprovalSchema.parse(input);
  const session = await requirePermission("approve", "Member");

  const member = await prisma.member.update({
    where: { id: data.memberId },
    data: {
      status: "MEMBER",
      joinDate: new Date(),
    },
  });

  await logAudit({
    action: "member_application.approve",
    subject: "Member",
    subjectId: member.id,
    actorId: session.user.id,
  });

  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${member.id}`);
  return { success: true, data: member };
}
