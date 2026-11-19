"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/database";
import {
  PREVIEW_COOKIE,
  assertNotPreviewing,
  getAbilityContext,
  isAdmin,
  requireAdmin,
  requireSuperAdmin,
} from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { isSuperAdmin } from "@/lib/rbac/abilities";
import { delegateUnits, delegationProblem, keysInUnit } from "@/lib/rbac/delegation";
import { userHasAdminAccess } from "@/lib/rbac/access";
import { ALL, cleanPermissionKeys, isUnitScopable } from "@/lib/rbac/catalog";
import {
  accessGrantSchema,
  adminRoleSaveSchema,
  type AccessGrantInput,
  type AdminRoleSaveInput,
} from "@/lib/schemas";

type Result = { success: true } | { success: false; error: string };

const fail = (error: string): Result => ({ success: false, error });

function activeWhere() {
  return { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] };
}

function done(): Result {
  revalidatePath("/admin/users");
  return { success: true };
}

/** For the admin login screen: does the signed-in user have any admin role? */
export async function hasAdminPanelAccess(): Promise<boolean> {
  return isAdmin();
}

/**
 * Who may manage access here: Super Admins everywhere, or delegates
 * (access.delegate) for their own units only.
 */
async function requireAccessManager() {
  const session = await requireAdmin();
  const ctx = await getAbilityContext();
  const isSuper = isSuperAdmin(ctx);
  const units = delegateUnits(ctx);
  if (units !== "all" && units.length === 0) {
    redirect(`/unauthorized?need=${encodeURIComponent("create:RoleAssignment")}`);
  }
  return { session, ctx, isSuper, units };
}
type AccessManager = Awaited<ReturnType<typeof requireAccessManager>>;

/** delegationProblem + (when granting) the target must be a member of the unit. */
async function delegationError(
  m: AccessManager,
  role: { name: string; isSystem: boolean; permissions: string[] },
  unitId: string | null,
  targetUserId: string,
  { requireMembership }: { requireMembership: boolean },
): Promise<string | null> {
  if (m.isSuper) return null;
  const problem = delegationProblem(m.ctx, role, unitId, targetUserId);
  if (problem || !requireMembership || !unitId) return problem;
  const isMember = await prisma.member.count({
    where: { userId: targetUserId, units: { some: { unitId } } },
  });
  return isMember ? null : "They need to be a member of this unit with a website account.";
}

/** Roles a delegate may hand out, per unit. */
function grantableByUnit(
  m: AccessManager,
  roles: { id: string; isSystem: boolean; permissions: string[] }[],
  unitIds: string[],
): Record<string, string[]> {
  return Object.fromEntries(
    unitIds.map((unitId) => {
      const held = keysInUnit(m.ctx, unitId);
      return [
        unitId,
        roles
          .filter((r) => m.isSuper || (!r.isSystem && isUnitScopable(r.permissions) && r.permissions.every((k) => held.has(k))))
          .map((r) => r.id),
      ];
    }),
  );
}

export async function getAccessOverview() {
  const m = await requireAccessManager();
  const unitFilter = m.isSuper ? {} : { unitId: m.units === "all" ? { not: null } : { in: m.units } };
  const [roles, assignments, units] = await Promise.all([
    prisma.adminRole.findMany({
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      include: { _count: { select: { assignments: true } } },
    }),
    prisma.adminRoleAssignment.findMany({
      where: unitFilter,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        unitId: true,
        expiresAt: true,
        createdAt: true,
        roleId: true,
        user: { select: { id: true, name: true, email: true, image: true } },
        grantedBy: { select: { name: true } },
      },
    }),
    prisma.churchUnitOption.findMany({
      where: m.isSuper || m.units === "all" ? {} : { id: { in: m.units } },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, isActive: true },
    }),
  ]);
  const grantable = grantableByUnit(m, roles, units.map((u) => u.id));
  return {
    mode: m.isSuper ? ("super" as const) : ("delegate" as const),
    me: m.ctx.userId,
    units,
    grantable,
    roles: m.isSuper ? roles : roles.filter((r) => !r.isSystem && isUnitScopable(r.permissions)),
    assignments: assignments.map((a) => ({
      ...a,
      // Delegates can remove only what they could have given (UI hint; re-checked on submit).
      canRevoke:
        m.isSuper ||
        (a.unitId !== null && a.user.id !== m.ctx.userId && (grantable[a.unitId] ?? []).includes(a.roleId)),
    })),
  };
}

export async function getAdminRole(id: string) {
  await requireSuperAdmin();
  return prisma.adminRole.findUnique({
    where: { id },
    include: {
      assignments: {
        select: { id: true, unitId: true, user: { select: { name: true } } },
      },
    },
  });
}

export async function searchUsersForAccess(q: string, unitId?: string | null) {
  const m = await requireAccessManager();
  const term = q.trim();
  if (term.length < 2) return [];
  // Delegates only see people in a unit they manage (no browsing all accounts).
  if (!m.isSuper && (!unitId || (m.units !== "all" && !m.units.includes(unitId)))) return [];
  return prisma.user.findMany({
    where: {
      banned: { not: true },
      ...(m.isSuper ? {} : { member: { units: { some: { unitId: unitId! } } } }),
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ],
    },
    orderBy: { name: "asc" },
    take: 10,
    select: { id: true, name: true, email: true, image: true },
  });
}

export async function saveAdminRole(input: AdminRoleSaveInput): Promise<Result & { id?: string }> {
  await requireSuperAdmin();
  await assertNotPreviewing();
  const parsed = adminRoleSaveSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid role");
  const { id, name, description } = parsed.data;
  const permissions = cleanPermissionKeys(parsed.data.permissions).filter((k) => k !== ALL);
  if (permissions.length === 0) return fail("Pick at least one permission");

  const clash = await prisma.adminRole.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, NOT: id ? { id } : undefined },
    select: { id: true },
  });
  if (clash) return fail(`There is already a role called "${name}".`);

  if (id) {
    const before = await prisma.adminRole.findUnique({
      where: { id },
      select: { isSystem: true, permissions: true, name: true },
    });
    if (!before) return fail("Role not found");
    if (before.isSystem) return fail("The Super Admin role can't be edited.");

    // Changing the role must not silently widen unit-limited assignments.
    if (!isUnitScopable(permissions)) {
      const scoped = await prisma.adminRoleAssignment.count({
        where: { roleId: id, unitId: { not: null } },
      });
      if (scoped > 0) {
        return fail(
          `${scoped} assignment${scoped === 1 ? " limits" : "s limit"} this role to a unit, and some of the new permissions can't be limited to a unit. Remove those assignments first, or create a separate role.`,
        );
      }
    }

    await prisma.adminRole.update({
      where: { id },
      data: { name, description: description || null, permissions },
    });
    await logAudit({
      action: "admin_role.update",
      subject: "AdminRole",
      subjectId: id,
      meta: { before: { name: before.name, permissions: before.permissions }, after: { name, permissions } },
    });
    revalidatePath(`/admin/users/roles/${id}`);
    return { ...done(), id };
  }

  const role = await prisma.adminRole.create({
    data: { name, description: description || null, permissions },
  });
  await logAudit({
    action: "admin_role.create",
    subject: "AdminRole",
    subjectId: role.id,
    meta: { name, permissions },
  });
  return { ...done(), id: role.id };
}

export async function deleteAdminRole(id: string): Promise<Result> {
  await requireSuperAdmin();
  await assertNotPreviewing();
  const role = await prisma.adminRole.findUnique({
    where: { id },
    include: { assignments: { select: { userId: true, unitId: true } } },
  });
  if (!role) return fail("Role not found");
  if (role.isSystem) return fail("The Super Admin role can't be deleted.");
  await prisma.adminRole.delete({ where: { id } });
  await logAudit({
    action: "admin_role.delete",
    subject: "AdminRole",
    subjectId: id,
    meta: { name: role.name, permissions: role.permissions, removedAssignments: role.assignments },
  });
  return done();
}

export async function grantAccess(input: AccessGrantInput): Promise<Result> {
  const m = await requireAccessManager();
  await assertNotPreviewing();
  const { session } = m;
  const parsed = accessGrantSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const { userId, roleId, unitId, expiresAt } = parsed.data;

  const [user, role, unit] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, banned: true } }),
    prisma.adminRole.findUnique({ where: { id: roleId }, select: { id: true, name: true, isSystem: true, permissions: true } }),
    unitId ? prisma.churchUnitOption.findUnique({ where: { id: unitId }, select: { name: true } }) : null,
  ]);
  if (!user) return fail("User not found");
  if (user.banned) return fail("This account is banned.");
  if (!role) return fail("Role not found");
  if (unitId && !unit) return fail("Church unit not found");
  const denied = await delegationError(m, role, unitId, userId, { requireMembership: true });
  if (denied) return fail(denied);
  if (unitId && !isUnitScopable(role.permissions)) {
    return fail(`"${role.name}" includes permissions that can't be limited to one unit. Grant it everywhere, or use a role with only member and pastoral-care permissions.`);
  }
  if (role.isSystem && expiresAt) return fail("Super Admin access can't expire — remove it by hand when needed.");
  if (expiresAt && expiresAt <= new Date()) return fail("The end date must be in the future.");

  const existing = await prisma.adminRoleAssignment.findFirst({
    where: { userId, roleId, unitId },
    select: { id: true },
  });
  if (existing) {
    // Re-granting refreshes the expiry instead of duplicating the row.
    await prisma.adminRoleAssignment.update({ where: { id: existing.id }, data: { expiresAt } });
  } else {
    await prisma.adminRoleAssignment.create({
      data: { userId, roleId, unitId, expiresAt, grantedById: session.user.id },
    });
  }
  await logAudit({
    action: "access.grant",
    subject: "User",
    subjectId: userId,
    meta: { role: role.name, roleId, unit: unit?.name ?? null, unitId, expiresAt: expiresAt?.toISOString() ?? null },
  });
  return done();
}

export async function revokeAccess(assignmentId: string): Promise<Result> {
  const m = await requireAccessManager();
  await assertNotPreviewing();
  const { session } = m;
  const assignment = await prisma.adminRoleAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      role: { select: { name: true, isSystem: true, permissions: true } },
      unit: { select: { name: true } },
    },
  });
  if (!assignment) return fail("That access was already removed.");
  const denied = await delegationError(m, assignment.role, assignment.unitId, assignment.userId, {
    requireMembership: false,
  });
  if (denied) return fail(denied);

  if (assignment.role.isSystem && assignment.userId === session.user.id) {
    return fail("You can't remove your own Super Admin access. Ask another Super Admin.");
  }

  // Serializable so two Super Admins removing each other can't both succeed.
  const error = await prisma.$transaction(
    async (tx) => {
      if (assignment.role.isSystem) {
        const others = await tx.adminRoleAssignment.count({
          where: { roleId: assignment.roleId, unitId: null, userId: { not: assignment.userId }, ...activeWhere() },
        });
        if (others === 0) return "This is the last Super Admin. Make someone else a Super Admin first.";
      }
      await tx.adminRoleAssignment.deleteMany({ where: { id: assignmentId } });
      return null;
    },
    { isolationLevel: "Serializable" },
  );
  if (error) return fail(error);
  await logAudit({
    action: "access.revoke",
    subject: "User",
    subjectId: assignment.userId,
    meta: { role: assignment.role.name, unit: assignment.unit?.name ?? null, grantedAt: assignment.createdAt.toISOString() },
  });
  return done();
}

/** "View as": a Super Admin previews someone's admin access, read-only. */
export async function startPreview(userId: string) {
  const session = await requireSuperAdmin();
  if (userId === session.user.id) return;
  if (!(await userHasAdminAccess(userId))) throw new Error("They have no admin access to preview.");
  (await cookies()).set(PREVIEW_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
  await logAudit({ action: "access.preview", subject: "User", subjectId: userId });
  redirect("/admin");
}

export async function exitPreview() {
  const ctx = await getAbilityContext();
  (await cookies()).delete(PREVIEW_COOKIE);
  redirect(ctx.preview ? "/admin/users" : "/admin");
}
