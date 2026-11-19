import { prisma } from "@/lib/database";
import type { Grant } from "./abilities";

/** A user's active (unexpired) role assignments as grants. */
export async function loadGrants(userId: string): Promise<Grant[]> {
  const rows = await prisma.adminRoleAssignment.findMany({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { unitId: true, role: { select: { permissions: true } } },
  });
  return rows.map((r) => ({ permissions: r.role.permissions, unitId: r.unitId }));
}

/** True if the user holds any active admin role. */
export async function userHasAdminAccess(userId: string): Promise<boolean> {
  return (await loadGrants(userId)).length > 0;
}
