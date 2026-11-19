import { isSuperAdmin, scopeOf, type AbilityContext } from "./abilities";
import { PERMISSIONS, isUnitScopable } from "./catalog";

type Role = { name: string; isSystem: boolean; permissions: string[] };

/** Permission keys the user holds inside a unit: org-wide grants + that unit's. */
export function keysInUnit(ctx: AbilityContext, unitId: string): Set<string> {
  return new Set(
    ctx.grants.filter((g) => g.unitId === null || g.unitId === unitId).flatMap((g) => g.permissions),
  );
}

/** Units the user may manage access for: "all" (Super Admin) or unit ids. */
export function delegateUnits(ctx: AbilityContext): "all" | string[] {
  return isSuperAdmin(ctx) ? "all" : scopeOf(ctx, "create", "RoleAssignment");
}

/**
 * Why a non-Super-Admin may not give/remove `role` for `targetUserId` in
 * `unitId` (null = allowed). Delegates only act in their units, only with
 * unit-limited roles, never beyond what they hold there, never on themselves.
 * Unit membership of the target is checked separately (needs the DB).
 */
export function delegationProblem(
  ctx: AbilityContext,
  role: Role,
  unitId: string | null,
  targetUserId: string,
): string | null {
  if (isSuperAdmin(ctx)) return null;
  const units = delegateUnits(ctx);
  if (!unitId) return "Only Super Admins can give or remove access everywhere.";
  if (units !== "all" && !units.includes(unitId)) return "You can only manage access for your own unit.";
  if (role.isSystem || !isUnitScopable(role.permissions)) return `"${role.name}" can't be limited to a unit.`;
  const held = keysInUnit(ctx, unitId);
  const missing = role.permissions.filter((k) => !held.has(k));
  if (missing.length) {
    return `You can only give roles within your own access. "${role.name}" also includes: ${missing
      .map((k) => PERMISSIONS[k]?.label ?? k)
      .join("; ")}.`;
  }
  if (targetUserId === ctx.userId) return "You can't change your own access.";
  return null;
}
