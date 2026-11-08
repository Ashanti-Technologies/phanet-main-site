import { prisma } from "@/lib/database";

/** Open = switched on, published, and before the closing time (or event start). */
export function isRegistrationOpen(event: {
  status: string;
  registrationEnabled: boolean;
  registrationClosesAt: Date | null;
  date: Date;
}) {
  if (!event.registrationEnabled || event.status !== "PUBLISHED") return false;
  return Date.now() < (event.registrationClosesAt ?? event.date).getTime();
}

/**
 * Find one person by exact email, or by phone (last 9 digits, so
 * 0244 123 456 and +233 24 412 3456 match). Never a name search: members
 * must not be able to browse other people's details.
 */
export async function findMemberByContact(contact: string) {
  const c = contact.trim();
  if (c.includes("@")) {
    return prisma.member.findFirst({
      where: { email: { equals: c, mode: "insensitive" } },
      orderBy: { createdAt: "asc" },
      select: { id: true, fullName: true },
    });
  }
  const digits = c.replace(/\D/g, "");
  if (digits.length < 9) return null;
  const rows = await prisma.$queryRaw<{ id: string; fullName: string }[]>`
    SELECT id, "fullName" FROM member
    WHERE phone IS NOT NULL
      AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 9) = ${digits.slice(-9)}
    ORDER BY "createdAt" ASC
    LIMIT 1`;
  return rows[0] ?? null;
}

/** "Kwame Asante Mensah" → "Kwame M." — enough to confirm, not to harvest. */
export function maskName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}
