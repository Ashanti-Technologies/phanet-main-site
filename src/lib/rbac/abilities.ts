import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
  type MongoQuery,
} from "@casl/ability";
import { ROLES, type RoleKey } from "./roles";
import type { Action, Subject } from "./permissions";

export type AppAbility = MongoAbility<[Action, Subject], MongoQuery>;

// CASL infers a strict conditions type from the subject. Since our Subject is
// a string union with no schema, conditions resolve to `MongoQuery<never>`.
// We loosen the builder's `can` signature locally so call sites can pass plain
// query objects without per-line casts.
type LooseCan = (
  action: Action | Action[],
  subject: Subject | Subject[],
  conditions?: Record<string, unknown>,
) => void;

export interface AbilityContext {
  userId: string;
  roles: RoleKey[];
  /** Unit IDs the user has any unit-scoped role in (LEADER/ASSISTANT). */
  scopedUnitIds: string[];
}

export const ANONYMOUS_CONTEXT: AbilityContext = {
  userId: "",
  roles: [],
  scopedUnitIds: [],
};

/**
 * Build a CASL ability for the given user context. Roles are additive — a
 * user with multiple roles gets the union of their permissions.
 *
 * Subject-level conditions (e.g. unit scoping) live here so policy is in one
 * place and the rest of the app just calls `ability.can('update','Member', m)`.
 */
export function defineAbilityFor(ctx: AbilityContext): AppAbility {
  const builder = new AbilityBuilder<AppAbility>(createMongoAbility);
  const can = builder.can as unknown as LooseCan;
  const { build } = builder;
  const roles = new Set(ctx.roles);

  if (roles.has(ROLES.SUPER_ADMIN)) {
    can("manage", "all");
    return build();
  }

  if (roles.has(ROLES.PASTOR)) {
    can("access", "AdminPanel");
    can("manage", [
      "Member",
      "Household",
      "Tag",
      "Message",
      "MessageTemplate",
      "MessageBatch",
      "Service",
      "Attendance",
      "Visitation",
      "FollowUpTask",
      "Note",
      "MemberInvite",
      "PrayerRequest",
    ]);
    can("read", ["User", "ChurchUnit", "Project", "Commitment", "PaymentIntent", "AuditLog"]);
  }

  if (roles.has(ROLES.EDITOR)) {
    can("access", "AdminPanel");
    can("manage", ["Event", "ContentPage", "Sermon", "HomepageSection", "MediaAsset"]);
  }

  if (roles.has(ROLES.FINANCE)) {
    can("access", "AdminPanel");
    can("manage", ["Project", "Commitment", "PaymentIntent", "ProofUpload"]);
    can("read", ["Member", "ChurchUnit"]);
  }

  if (roles.has(ROLES.UNIT_LEADER)) {
    can("access", "AdminPanel");
    // Read everyone in the directory…
    can("read", "Member");
    // …but only mutate members that share at least one of the user's units.
    if (ctx.scopedUnitIds.length > 0) {
      can(
        ["update", "create"],
        "Member",
        ({ unitIds: { $in: ctx.scopedUnitIds } }),
      );
      can(
        ["read", "create", "update"],
        "Visitation",
        ({ unitIds: { $in: ctx.scopedUnitIds } }),
      );
      can(
        ["read", "create", "update"],
        "FollowUpTask",
        ({ assignedToId: ctx.userId }),
      );
      // Notes — only general visibility. Pastoral notes stay restricted.
      can("read", "Note", ({ visibility: "GENERAL" }));
    }
    can("read", ["ChurchUnit", "Tag", "Service", "Attendance"]);
  }

  if (roles.has(ROLES.MEMBER)) {
    can("access", "MemberPortal");
    // Self-service: read/update only the member row linked to this user.
    can(["read", "update"], "Member", ({ userId: ctx.userId }));
    can("read", ["Event", "Service"]);
    // Commitments and PaymentIntents are matched by user id (see Phase 5).
    can("read", ["Commitment", "PaymentIntent"], ({ userId: ctx.userId }));
  }

  return build();
}
