"use server";

import { headers } from "next/headers";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database";
import { getMessagingService } from "@/lib/messaging";
import { renderEmail } from "@/lib/email-templates/render";
import { ClaimMagicLinkEmail } from "@/lib/email-templates/ClaimMagicLinkEmail";
import { logAudit } from "@/lib/audit";
import { ROLES, serializeRoles } from "@/lib/rbac/roles";
import {
  startClaimByEmailSchema,
  startClaimByPhoneSchema,
  verifyClaimOtpSchema,
  type StartClaimByEmailInput,
  type StartClaimByPhoneInput,
  type VerifyClaimOtpInput,
} from "@/lib/schemas/member-claim.schema";
import {
  CLAIMABLE_STATUSES,
  EMAIL_TOKEN_TTL_MIN,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MIN,
  SEND_THROTTLE_SECONDS,
  expiresInMinutes,
  findCandidateMemberByEmail,
  findCandidateMemberByPhone,
  generateClaimToken,
  generateOtp,
  getBaseUrl,
  hashSecret,
  safeEqualHex,
} from "@/lib/member-claim";

/**
 * Neutral response shape — never reveals whether a contact matched, missed,
 * or was ambiguous.
 */
const NEUTRAL_OK = { ok: true as const };

export async function startClaimByEmail(input: StartClaimByEmailInput) {
  const data = startClaimByEmailSchema.parse(input);
  const lookup = await findCandidateMemberByEmail(data.email);

  if (lookup.kind === "ambiguous") {
    await logAudit({
      action: "member_claim.ambiguous",
      subject: "MemberInvite",
      meta: { channel: "EMAIL", email: data.email },
    });
    return NEUTRAL_OK;
  }
  if (lookup.kind === "none") return NEUTRAL_OK;

  const member = lookup.member;

  // Send-throttle: silently swallow re-sends within the window.
  const existing = await prisma.memberInvite.findUnique({
    where: { memberId: member.id },
    select: { lastSentAt: true },
  });
  if (
    existing?.lastSentAt &&
    Date.now() - existing.lastSentAt.getTime() < SEND_THROTTLE_SECONDS * 1000
  ) {
    return NEUTRAL_OK;
  }

  const token = generateClaimToken();
  const tokenHash = hashSecret(token);
  const expiresAt = expiresInMinutes(EMAIL_TOKEN_TTL_MIN);
  const now = new Date();

  await prisma.memberInvite.upsert({
    where: { memberId: member.id },
    create: {
      memberId: member.id,
      email: data.email,
      phone: null,
      channel: "EMAIL",
      tokenHash,
      codeHash: null,
      expiresAt,
      consumedAt: null,
      attempts: 0,
      lastSentAt: now,
    },
    update: {
      email: data.email,
      phone: null,
      channel: "EMAIL",
      tokenHash,
      codeHash: null,
      expiresAt,
      consumedAt: null,
      attempts: 0,
      lastSentAt: now,
    },
  });

  const url = `${await getBaseUrl()}/claim/${token}`;
  const { html, text } = await renderEmail(
    ClaimMagicLinkEmail({
      memberName: member.fullName,
      url,
      expiresInMinutes: EMAIL_TOKEN_TTL_MIN,
    }),
  );
  const service = getMessagingService("EMAIL");
  await service.send({
    to: data.email,
    subject: "Claim your PHANET member record",
    body: html,
    text,
  });

  return NEUTRAL_OK;
}

export async function startClaimByPhone(input: StartClaimByPhoneInput) {
  const data = startClaimByPhoneSchema.parse(input);
  const lookup = await findCandidateMemberByPhone(data.phone);

  if (lookup.kind === "ambiguous") {
    await logAudit({
      action: "member_claim.ambiguous",
      subject: "MemberInvite",
      meta: { channel: "PHONE", phone: data.phone },
    });
    return NEUTRAL_OK;
  }
  if (lookup.kind === "none") return NEUTRAL_OK;

  const member = lookup.member;

  const existing = await prisma.memberInvite.findUnique({
    where: { memberId: member.id },
    select: { lastSentAt: true },
  });
  if (
    existing?.lastSentAt &&
    Date.now() - existing.lastSentAt.getTime() < SEND_THROTTLE_SECONDS * 1000
  ) {
    return NEUTRAL_OK;
  }

  const code = generateOtp();
  const codeHash = hashSecret(code);
  // A token row is required (tokenHash is unique non-null) — generate a random
  // one for the PHONE channel even though the user verifies via OTP.
  const placeholderToken = generateClaimToken();
  const tokenHash = hashSecret(placeholderToken);
  const expiresAt = expiresInMinutes(OTP_TTL_MIN);
  const now = new Date();

  await prisma.memberInvite.upsert({
    where: { memberId: member.id },
    create: {
      memberId: member.id,
      email: member.email ?? "",
      phone: member.phone ?? data.phone,
      channel: "PHONE",
      tokenHash,
      codeHash,
      expiresAt,
      consumedAt: null,
      attempts: 0,
      lastSentAt: now,
    },
    update: {
      email: member.email ?? "",
      phone: member.phone ?? data.phone,
      channel: "PHONE",
      tokenHash,
      codeHash,
      expiresAt,
      consumedAt: null,
      attempts: 0,
      lastSentAt: now,
    },
  });

  const recipient = member.phone ?? data.phone;
  const sms = getMessagingService("SMS");
  await sms.send({
    to: recipient,
    body: `Your PHANET verification code is ${code}. It expires in ${OTP_TTL_MIN} minutes.`,
  });

  return NEUTRAL_OK;
}

export async function verifyClaimOtp(
  input: VerifyClaimOtpInput,
): Promise<{ ok: true; token: string } | { ok: false }> {
  const data = verifyClaimOtpSchema.parse(input);

  const lookup = await findCandidateMemberByPhone(data.phone);
  if (lookup.kind !== "match") return { ok: false };

  const invite = await prisma.memberInvite.findUnique({
    where: { memberId: lookup.member.id },
  });
  if (!invite || invite.channel !== "PHONE" || !invite.codeHash) {
    return { ok: false };
  }
  if (invite.consumedAt) return { ok: false };
  if (invite.expiresAt < new Date()) return { ok: false };
  if (invite.attempts >= OTP_MAX_ATTEMPTS) return { ok: false };

  const submittedHash = hashSecret(data.code);
  const match = safeEqualHex(submittedHash, invite.codeHash);

  if (!match) {
    await prisma.memberInvite.update({
      where: { id: invite.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false };
  }

  // OTP correct — mint a one-time exchange token, persist its hash, and
  // hand the raw value to the client to navigate to /claim/<token>.
  const token = generateClaimToken();
  await prisma.memberInvite.update({
    where: { id: invite.id },
    data: {
      tokenHash: hashSecret(token),
      codeHash: null,
      // Refresh expiry to a short bridge window for the consume step.
      expiresAt: expiresInMinutes(5),
    },
  });

  return { ok: true, token };
}

export async function getClaimTokenPreview(token: string) {
  const invite = await prisma.memberInvite.findUnique({
    where: { tokenHash: hashSecret(token) },
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          email: true,
          status: true,
          userId: true,
        },
      },
    },
  });
  if (!invite) return { status: "invalid" as const };
  if (invite.consumedAt) return { status: "consumed" as const };
  if (invite.expiresAt < new Date()) return { status: "expired" as const };
  if (invite.member.userId) return { status: "linked" as const };
  if (!CLAIMABLE_STATUSES.includes(invite.member.status)) {
    return { status: "invalid" as const };
  }
  return {
    status: "valid" as const,
    memberName: invite.member.fullName,
  };
}

export async function consumeClaimToken(token: string) {
  const invite = await prisma.memberInvite.findUnique({
    where: { tokenHash: hashSecret(token) },
    include: { member: true },
  });
  if (!invite) throw new Error("Claim link is invalid");
  if (invite.consumedAt) throw new Error("Claim link has already been used");
  if (invite.expiresAt < new Date()) throw new Error("Claim link has expired");
  if (invite.member.userId) {
    throw new Error("This member already has portal access");
  }
  if (!CLAIMABLE_STATUSES.includes(invite.member.status)) {
    throw new Error("Claim link is invalid");
  }

  const email = (
    invite.member.email?.trim() ||
    invite.email?.trim() ||
    `claim-${invite.member.id}@phanet.local`
  ).toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });
  if (existingUser) {
    // An account already exists for this email — usually because the user
    // signed up via Google earlier, or a previous claim half-completed.
    // The click itself proves email ownership, so it's safe to:
    //   - link the member to that user,
    //   - grant the MEMBER role if they don't already have one,
    //   - consume the invite so the link can't be replayed.
    // We then bounce them to login with the email pre-filled. They sign in
    // via magic link or Google and land on /me with full member access.
    const currentRoles = existingUser.role
      ? existingUser.role.split(",").map((r) => r.trim()).filter(Boolean)
      : [];
    const nextRoles = currentRoles.includes(ROLES.MEMBER)
      ? currentRoles
      : [...currentRoles, ROLES.MEMBER];

    await prisma.$transaction([
      prisma.user.update({
        where: { id: existingUser.id },
        data: { role: nextRoles.join(",") },
      }),
      prisma.member.update({
        where: { id: invite.memberId },
        data: {
          userId: existingUser.id,
          status:
            invite.member.status === "VISITOR" ? "REGULAR" : invite.member.status,
        },
      }),
      prisma.memberInvite.update({
        where: { id: invite.id },
        data: { consumedAt: new Date() },
      }),
    ]);

    await logAudit({
      action: "member_claim.consume_existing_user",
      subject: "MemberInvite",
      subjectId: invite.id,
      actorId: existingUser.id,
      meta: { memberId: invite.memberId, channel: invite.channel },
    });

    return { kind: "existing-account" as const, email };
  }

  // Random password the user never sees; they will sign in via magic link or
  // password reset on a later visit.
  const randomPassword = randomBytes(48).toString("base64url");

  const signUp = await auth.api.signUpEmail({
    headers: await headers(),
    body: {
      email,
      password: randomPassword,
      name: invite.member.fullName,
      rememberMe: true,
    },
  });

  const userId = signUp.user.id;

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
      data: { userId, status: "REGULAR" },
    }),
    prisma.memberInvite.update({
      where: { id: invite.id },
      data: { consumedAt: new Date() },
    }),
  ]);

  await logAudit({
    action: "member_claim.consume",
    subject: "MemberInvite",
    subjectId: invite.id,
    actorId: userId,
    meta: {
      memberId: invite.memberId,
      channel: invite.channel,
    },
  });

  return { kind: "signed-in" as const };
}
