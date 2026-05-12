"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { getServerAuthSession } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth-guard";
import {
  adminUserRoleSchema,
  adminUserRolesSchema,
  type AdminUserRoleInput,
  type AdminUserRolesInput,
} from "@/lib/schemas";
import {
  ROLES,
  parseRoles,
  serializeRoles,
  hasAnyAdminRole,
  type RoleKey,
} from "@/lib/rbac/roles";
import { logAudit } from "@/lib/audit";

export async function getAdminUsers() {
  await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      emailVerified: true,
      createdAt: true,
      unitRoles: {
        select: { unitId: true, role: true },
      },
    },
  });
  return users.map((u) => ({
    ...u,
    roles: parseRoles(u.role),
    unitIds: u.unitRoles.map((r) => r.unitId),
  }));
}

/**
 * Legacy single-role update kept for back-compat with any old call sites.
 * Maps "admin" → super_admin and "user" → member.
 */
export async function updateUserRole(input: AdminUserRoleInput) {
  await requireAdmin();
  const session = await getServerAuthSession();
  const data = adminUserRoleSchema.parse(input);

  if (session?.user.id === data.userId && data.role !== "admin") {
    throw new Error("You cannot remove your own admin access.");
  }

  const newRoles: RoleKey[] =
    data.role === "admin" ? [ROLES.SUPER_ADMIN] : [ROLES.MEMBER];

  return updateUserRolesInternal(data.userId, newRoles, []);
}

/**
 * Set the full set of roles for a user. Replaces any existing roles. When
 * `unit_leader` is included, `unitIds` must list at least one unit.
 */
export async function updateUserRoles(input: AdminUserRolesInput) {
  await requireAdmin();
  const session = await getServerAuthSession();
  const data = adminUserRolesSchema.parse(input);

  if (session?.user.id === data.userId) {
    const newRoles = data.roles as RoleKey[];
    const oldCtx = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { role: true },
    });
    const oldRoles = parseRoles(oldCtx?.role);
    if (hasAnyAdminRole(oldRoles) && !hasAnyAdminRole(newRoles)) {
      throw new Error("You cannot remove your own admin access.");
    }
  }

  return updateUserRolesInternal(
    data.userId,
    data.roles as RoleKey[],
    data.unitIds,
  );
}

async function updateUserRolesInternal(
  userId: string,
  roles: RoleKey[],
  unitIds: string[],
) {
  const role = serializeRoles(roles) || null;
  const needsUnits = roles.includes(ROLES.UNIT_LEADER);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { role },
    });
    await tx.userUnitRole.deleteMany({ where: { userId } });
    if (needsUnits && unitIds.length > 0) {
      await tx.userUnitRole.createMany({
        data: unitIds.map((unitId) => ({
          userId,
          unitId,
          role: "LEADER" as const,
        })),
        skipDuplicates: true,
      });
    }
  });

  await logAudit({
    action: "user.update_roles",
    subject: "User",
    subjectId: userId,
    meta: { roles, unitIds: needsUnits ? unitIds : [] },
  });

  revalidatePath("/admin/users");
  return { success: true };
}
