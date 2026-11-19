import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
  type MongoQuery,
} from "@casl/ability";
import type { Action, Subject } from "./permissions";
import { ALL, PERMISSIONS, ruleMatches } from "./catalog";

export type AppAbility = MongoAbility<[Action, Subject], MongoQuery>;

// CASL infers a strict conditions type from the subject. Since our Subject is
// a string union with no schema, conditions resolve to `MongoQuery<never>`.
type LooseCan = (
  action: Action | Action[],
  subject: Subject | Subject[],
  conditions?: Record<string, unknown>,
) => void;

/** One active role assignment: its permission keys, everywhere or in one unit. */
export type Grant = { permissions: string[]; unitId: string | null };

export interface AbilityContext {
  userId: string;
  grants: Grant[];
  /** A Super Admin previewing someone else's access ("view as"). Read-only. */
  preview?: { userId: string; name: string };
}

export const ANONYMOUS_CONTEXT: AbilityContext = { userId: "", grants: [] };

export function hasAdminAccess(ctx: AbilityContext): boolean {
  return ctx.grants.length > 0;
}

export function isSuperAdmin(ctx: AbilityContext): boolean {
  return ctx.grants.some((g) => g.unitId === null && g.permissions.includes(ALL));
}

/**
 * Build a CASL ability from the user's grants. Grants are additive.
 *
 * Unit-scoped checks need the instance to carry `unitIds` (the member's
 * units), e.g. `ability.can('update', subject('Member', { unitIds }))`.
 * A type-level check (`can('update', 'Member')`) passes for unit-scoped users
 * too, so list queries must narrow with `scopeOf` and mutations must pass an
 * instance.
 */
export function defineAbilityFor(ctx: AbilityContext): AppAbility {
  const builder = new AbilityBuilder<AppAbility>(createMongoAbility);
  const can = builder.can as unknown as LooseCan;

  if (ctx.userId) {
    can("access", "MemberPortal");
    can(["read", "update"], "Member", { userId: ctx.userId });
    can("read", ["Commitment", "PaymentIntent"], { userId: ctx.userId });
  }

  if (!hasAdminAccess(ctx)) return builder.build();

  // Every admin: the panel, lookup lists for pickers, and tasks assigned to them.
  can("access", "AdminPanel");
  can("read", ["ChurchUnit", "Tag", "User"]);
  can(["read", "update"], "FollowUpTask", { assignedToId: ctx.userId });

  if (isSuperAdmin(ctx)) {
    can("manage", "all");
    return builder.build();
  }

  for (const grant of ctx.grants) {
    for (const key of grant.permissions) {
      for (const rule of PERMISSIONS[key]?.rules ?? []) {
        if (grant.unitId === null) {
          can(rule.action, rule.subject, rule.conditions);
        } else if (rule.unit) {
          can(rule.action, rule.subject, {
            ...rule.conditions,
            unitIds: { $in: [grant.unitId] },
          });
        }
      }
    }
  }

  return builder.build();
}

/**
 * Where the user may do `action` on `subject`: "all", or the unit ids they're
 * limited to ([] = nowhere). Use it to narrow list queries.
 */
export function scopeOf(
  ctx: AbilityContext,
  action: Action,
  subject: Subject,
): "all" | string[] {
  if (isSuperAdmin(ctx)) return "all";
  const units = new Set<string>();
  for (const grant of ctx.grants) {
    for (const key of grant.permissions) {
      for (const rule of PERMISSIONS[key]?.rules ?? []) {
        if (!ruleMatches(rule, action, subject)) continue;
        if (grant.unitId === null) return "all";
        if (rule.unit) units.add(grant.unitId);
      }
    }
  }
  return [...units];
}
