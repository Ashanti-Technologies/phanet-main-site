import { redirect } from "next/navigation";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/database";
import { requirePermission } from "@/lib/auth-guard";

const memberPortalInclude = {
  units: { include: { unit: { select: { id: true, name: true } } } },
  tags: { include: { tag: { select: { id: true, label: true } } } },
  eventRsvps: { include: { event: true } },
} satisfies Prisma.MemberInclude;

export async function getCurrentMemberForPortal() {
  const session = await requirePermission("access", "MemberPortal");

  const linkedMember = await prisma.member.findUnique({
    where: { userId: session.user.id },
    include: memberPortalInclude,
  });
  if (linkedMember) return { session, member: linkedMember };

  const email = session.user.email?.trim();
  if (!email) return { session, member: null };

  const emailMatches = await prisma.member.findMany({
    where: {
      email: { equals: email, mode: "insensitive" },
    },
    include: memberPortalInclude,
    take: 2,
  });

  if (emailMatches.length !== 1) return { session, member: null };

  const [match] = emailMatches;
  if (match.userId && match.userId !== session.user.id) {
    return { session, member: null };
  }
  if (match.userId === session.user.id) {
    return { session, member: match };
  }

  const linkedByEmail = await prisma.member.update({
    where: { id: match.id },
    data: { userId: session.user.id },
    include: memberPortalInclude,
  });

  return { session, member: linkedByEmail };
}

export async function getCurrentMemberOrRedirect() {
  const { session, member } = await getCurrentMemberForPortal();

  if (!member) redirect("/membership/apply");
  return { session, member };
}

export function normalizedPhoneVariants(phone: string | null | undefined) {
  if (!phone) return [];
  const digits = phone.replace(/[^\d]/g, "");
  const withPlus = phone.replace(/[^\d+]/g, "");
  return Array.from(new Set([phone, digits, withPlus].filter(Boolean)));
}
