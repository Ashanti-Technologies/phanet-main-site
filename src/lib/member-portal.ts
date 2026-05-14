import { redirect } from "next/navigation";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/database";
import { requirePermission } from "@/lib/auth-guard";

const memberPortalInclude = {
  units: { include: { unit: { select: { id: true, name: true } } } },
  tags: { include: { tag: { select: { id: true, label: true } } } },
  eventRsvps: { include: { event: true } },
  countryRef: { select: { id: true, name: true, code: true } },
  regionRef: { select: { id: true, name: true } },
  household: { select: { id: true, name: true } },
  phanetProfile: true,
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

type CompletenessMember = {
  preferredName: string | null;
  occupation: string | null;
  dob: Date | null;
  gender: string | null;
  maritalStatus: string | null;
  phone: string | null;
  whatsapp: string | null;
  addressLine: string | null;
  city: string | null;
  country: string | null;
  region: string | null;
  photoUrl: string | null;
  phanetProfile?: {
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    lifeStage: string | null;
    regionalChapter: string | null;
  } | null;
};

const has = (v: unknown) =>
  v !== null && v !== undefined && (typeof v !== "string" || v.trim() !== "");

export function computeProfileCompleteness(member: CompletenessMember) {
  const memberFields = [
    member.preferredName,
    member.occupation,
    member.dob,
    member.gender,
    member.maritalStatus,
    member.phone,
    member.whatsapp,
    member.addressLine,
    member.city,
    member.country,
    member.region,
    member.photoUrl,
  ];
  const phanetFields = [
    member.phanetProfile?.emergencyContactName ?? null,
    member.phanetProfile?.emergencyContactPhone ?? null,
    member.phanetProfile?.lifeStage ?? null,
    member.phanetProfile?.regionalChapter ?? null,
  ];
  const all = [...memberFields, ...phanetFields];
  const filled = all.filter(has).length;
  const total = all.length;
  return {
    filled,
    total,
    percent: Math.round((filled / total) * 100),
  };
}

export function normalizedPhoneVariants(phone: string | null | undefined) {
  if (!phone) return [];
  const digits = phone.replace(/[^\d]/g, "");
  const withPlus = phone.replace(/[^\d+]/g, "");
  return Array.from(new Set([phone, digits, withPlus].filter(Boolean)));
}
