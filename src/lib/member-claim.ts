import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { headers } from "next/headers";
import { MemberStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/database";
import { normalizedPhoneVariants } from "@/lib/member-portal";

export const CLAIMABLE_STATUSES: MemberStatus[] = [
  MemberStatus.PENDING_APPROVAL,
  MemberStatus.VISITOR,
];
export const EMAIL_TOKEN_TTL_MIN = 15;
export const OTP_TTL_MIN = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const SEND_THROTTLE_SECONDS = 60;

export type CandidateLookupResult =
  | { kind: "match"; member: CandidateMember }
  | { kind: "ambiguous" }
  | { kind: "none" };

export interface CandidateMember {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: string;
  userId: string | null;
}

export function hashSecret(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export function generateClaimToken(): string {
  return randomBytes(32).toString("base64url");
}

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function getBaseUrl(): Promise<string> {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  const list = await headers();
  const host = list.get("host") ?? "localhost:3000";
  const proto = list.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function findCandidateMemberByEmail(
  email: string,
): Promise<CandidateLookupResult> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { kind: "none" };

  const matches = await prisma.member.findMany({
    where: {
      email: { equals: normalized, mode: "insensitive" },
      userId: null,
      status: { in: CLAIMABLE_STATUSES },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      status: true,
      userId: true,
    },
    take: 2,
  });

  if (matches.length === 0) return { kind: "none" };
  if (matches.length > 1) return { kind: "ambiguous" };
  return { kind: "match", member: matches[0] };
}

export async function findCandidateMemberByPhone(
  phone: string,
): Promise<CandidateLookupResult> {
  const variants = normalizedPhoneVariants(phone);
  if (variants.length === 0) return { kind: "none" };

  const matches = await prisma.member.findMany({
    where: {
      phone: { in: variants },
      userId: null,
      status: { in: CLAIMABLE_STATUSES },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      status: true,
      userId: true,
    },
    take: 2,
  });

  if (matches.length === 0) return { kind: "none" };
  if (matches.length > 1) return { kind: "ambiguous" };
  return { kind: "match", member: matches[0] };
}

/**
 * Sign-in counterpart of /claim: a verified email matching exactly one
 * unlinked registry record links it, and moves it off PENDING_APPROVAL /
 * VISITOR like a claim does. Membership applications (/membership/apply)
 * keep their status so they stay in the approval queue.
 */
export async function linkMemberByVerifiedEmail(user: {
  id: string;
  email: string | null;
  emailVerified: boolean;
}): Promise<void> {
  const email = user.email?.trim();
  if (!email || !user.emailVerified) return;
  const already = await prisma.member.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (already) return;

  const matches = await prisma.member.findMany({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, status: true, notes: true, userId: true },
    take: 2,
  });
  if (matches.length !== 1 || matches[0].userId) return;
  const [m] = matches;
  const promote =
    CLAIMABLE_STATUSES.includes(m.status) &&
    !m.notes?.startsWith("Application intro:");

  // userId: null guard — a parallel sign-in / claim may have linked it first.
  const { count } = await prisma.member.updateMany({
    where: { id: m.id, userId: null },
    data: { userId: user.id, ...(promote && { status: MemberStatus.REGULAR }) },
  });
  if (!count) return;
  await prisma.auditLog
    .create({
      data: {
        actorId: user.id,
        action: "member_claim.auto_link",
        subject: "Member",
        subjectId: m.id,
        meta: { from: m.status, promoted: promote },
      },
    })
    .catch((err) => console.error("[member-claim] audit failed:", err));
}

export function expiresInMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}
