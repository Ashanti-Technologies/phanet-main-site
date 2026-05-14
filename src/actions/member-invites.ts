"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { requirePermission } from "@/lib/auth-guard";
import { getMessagingService } from "@/lib/messaging";
import { renderEmail } from "@/lib/email-templates/render";
import { MemberInviteEmail } from "@/lib/email-templates/MemberInviteEmail";
import { logAudit } from "@/lib/audit";
import { ROLES, serializeRoles } from "@/lib/rbac/roles";
import {
  memberInviteAcceptSchema,
  memberInviteSendSchema,
  type MemberInviteAcceptInput,
  type MemberInviteSendInput,
} from "@/lib/schemas/self-service.schema";

const INVITE_TTL_DAYS = 7;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function makeToken() {
  return randomBytes(32).toString("base64url");
}

async function getBaseUrl() {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function getMemberInvitePreview(token: string) {
  const invite = await prisma.memberInvite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      member: { select: { id: true, fullName: true, email: true, userId: true } },
    },
  });
  if (!invite) return { status: "invalid" as const };
  if (invite.consumedAt) return { status: "consumed" as const };
  if (invite.expiresAt < new Date()) return { status: "expired" as const };
  if (invite.member.userId) return { status: "linked" as const };
  return {
    status: "valid" as const,
    email: invite.email,
    memberName: invite.member.fullName,
  };
}

export async function sendMemberInvite(input: MemberInviteSendInput) {
  const data = memberInviteSendSchema.parse(input);
  const session = await requirePermission("create", "MemberInvite");

  const member = await prisma.member.findUnique({
    where: { id: data.memberId },
    select: { id: true, fullName: true, email: true, userId: true },
  });
  if (!member) throw new Error("Member not found");
  if (!member.email) throw new Error("Member must have an email before inviting");
  if (member.userId) throw new Error("This member already has portal access");

  const email = member.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error("A user account already exists for this email");
  }

  const token = makeToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

  const invite = await prisma.memberInvite.upsert({
    where: { memberId: member.id },
    create: {
      memberId: member.id,
      email,
      tokenHash,
      expiresAt,
      createdById: session.user.id,
    },
    update: {
      email,
      tokenHash,
      expiresAt,
      consumedAt: null,
      createdById: session.user.id,
    },
  });

  const url = `${await getBaseUrl()}/auth/accept-invite/${token}`;
  const { html, text } = await renderEmail(
    MemberInviteEmail({
      memberName: member.fullName,
      url,
      expiresInDays: INVITE_TTL_DAYS,
    }),
  );
  const service = getMessagingService("EMAIL");
  const result = await service.send({
    to: email,
    subject: "Set up your PHANET member portal",
    body: html,
    text,
  });
  if (!result.ok) throw new Error(result.error ?? "Failed to send invite");

  await logAudit({
    action: "member_invite.send",
    subject: "MemberInvite",
    subjectId: invite.id,
    actorId: session.user.id,
    meta: { memberId: member.id, email },
  });

  revalidatePath(`/admin/members/${member.id}`);
  revalidatePath("/admin/members");
  return { success: true, data: { id: invite.id, email, expiresAt } };
}

export async function acceptMemberInvite(input: MemberInviteAcceptInput) {
  const data = memberInviteAcceptSchema.parse(input);
  const invite = await prisma.memberInvite.findUnique({
    where: { tokenHash: hashToken(data.token) },
    include: { member: true },
  });
  if (!invite) throw new Error("Invite link is invalid");
  if (invite.consumedAt) throw new Error("Invite link has already been used");
  if (invite.expiresAt < new Date()) throw new Error("Invite link has expired");
  if (invite.member.userId) throw new Error("This member already has portal access");

  const email = invite.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new Error("A user account already exists for this email");

  // Password is generated server-side and never shown — members sign in via
  // magic link or Google after acceptance.
  const randomPassword = randomBytes(48).toString("base64url");
  const result = await auth.api.signUpEmail({
    headers: await headers(),
    body: {
      email,
      password: randomPassword,
      name: invite.member.fullName,
      rememberMe: true,
    },
  });

  const userId = result.user.id;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        role: serializeRoles([ROLES.MEMBER]),
        emailVerified: true,
      },
    }),
    prisma.member.update({
      where: { id: invite.memberId },
      data: { userId, status: "MEMBER" },
    }),
    prisma.memberInvite.update({
      where: { id: invite.id },
      data: { consumedAt: new Date() },
    }),
  ]);

  await logAudit({
    action: "member_invite.accept",
    subject: "MemberInvite",
    subjectId: invite.id,
    actorId: userId,
    meta: { memberId: invite.memberId },
  });

  revalidatePath("/me");
  return { success: true, data: { memberId: invite.memberId } };
}
