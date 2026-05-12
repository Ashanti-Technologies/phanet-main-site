import { redirect } from "next/navigation";
import { prisma } from "@/lib/database";
import { requirePermission } from "@/lib/auth-guard";

export async function getCurrentMemberOrRedirect() {
  const session = await requirePermission("access", "MemberPortal");
  const member = await prisma.member.findUnique({
    where: { userId: session.user.id },
    include: {
      units: { include: { unit: { select: { id: true, name: true } } } },
      tags: { include: { tag: { select: { id: true, label: true } } } },
      eventRsvps: { include: { event: true } },
    },
  });

  if (!member) redirect("/membership/apply");
  return { session, member };
}

export function normalizedPhoneVariants(phone: string | null | undefined) {
  if (!phone) return [];
  const digits = phone.replace(/[^\d]/g, "");
  const withPlus = phone.replace(/[^\d+]/g, "");
  return Array.from(new Set([phone, digits, withPlus].filter(Boolean)));
}
