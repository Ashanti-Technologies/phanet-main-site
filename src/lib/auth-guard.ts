import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { subject as casl_subject } from "@casl/ability";
import { getServerAuthSession } from "./auth";
import { prisma } from "./database";
import {
  ANONYMOUS_CONTEXT,
  defineAbilityFor,
  hasAdminAccess,
  isSuperAdmin,
  scopeOf as scopeOfCtx,
  type AbilityContext,
  type AppAbility,
} from "./rbac";
import { loadGrants } from "./rbac/access";
import type { Action, Subject } from "./rbac/permissions";

/**
 * Get the current session or null if not authenticated.
 */
export async function getSessionOrNull() {
  return getServerAuthSession();
}

/**
 * Require authentication — redirects to login if missing.
 */
export async function requireAuth(redirectTo?: string) {
  const session = await getServerAuthSession();
  if (!session?.user) {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") || "/";
    const callbackUrl = redirectTo || pathname;
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return session;
}

/**
 * Load the RBAC context for the current request (cached per request).
 * Read from the DB every request, so revoking access takes effect at once.
 * Returns ANONYMOUS_CONTEXT if not signed in.
 */
export const getAbilityContext = cache(async (): Promise<AbilityContext> => {
  const session = await getServerAuthSession();
  if (!session?.user) return ANONYMOUS_CONTEXT;
  const real = { userId: session.user.id, grants: await loadGrants(session.user.id) };

  // "View as": only honoured for a real Super Admin. Swaps in the target's
  // grants (never more than the Super Admin already has); writes are blocked.
  const previewId = (await cookies()).get(PREVIEW_COOKIE)?.value;
  if (!previewId || previewId === real.userId || !isSuperAdmin(real)) return real;
  const target = await prisma.user.findUnique({
    where: { id: previewId },
    select: { id: true, name: true },
  });
  if (!target) return real;
  return {
    userId: real.userId,
    grants: await loadGrants(target.id),
    preview: { userId: target.id, name: target.name },
  };
});

export const PREVIEW_COOKIE = "phanet.preview_as";
const READ_ONLY_ACTIONS = new Set<Action>(["read", "access"]);

/** Previews are read-only: block anything that would change data. */
export async function assertNotPreviewing(action: Action = "update") {
  if (READ_ONLY_ACTIONS.has(action)) return;
  if ((await getAbilityContext()).preview) redirect("/unauthorized?preview=1");
}

/**
 * Build a CASL ability for the current request. Cached per render.
 */
export const getAbility = cache(async (): Promise<AppAbility> => {
  const ctx = await getAbilityContext();
  return defineAbilityFor(ctx);
});

/**
 * Require that the current user can perform `action` on `subject`. Optionally
 * scope the check to a particular instance (e.g. a specific Member). Redirects
 * to /unauthorized if denied, /admin/login if not signed in.
 */
export async function requirePermission<S extends Subject>(
  action: Action,
  subjectName: S,
  instance?: Record<string, unknown>,
) {
  const session = await requireAuth("/admin/login");
  const ability = await getAbility();
  if (!check(ability, action, subjectName, instance)) deny(action, subjectName);
  await assertNotPreviewing(action);
  // Anything beyond member self-service needs a fresh, 2FA-backed admin
  // session — server actions are public endpoints, the layout guard isn't enough.
  const memberOnly = defineAbilityFor({ userId: session.user.id, grants: [] });
  if (!check(memberOnly, action, subjectName, instance)) await requireAdmin();
  return session;
}

/** Send the user to /unauthorized, saying which permission was missing. */
function deny(action: Action, subjectName: Subject): never {
  redirect(`/unauthorized?need=${encodeURIComponent(`${action}:${subjectName}`)}`);
}

/**
 * Where the current user may do `action` on `subject`: "all" or the unit ids
 * they're limited to. Narrow list queries with it, e.g.
 * `units: { some: { unitId: { in: scope } } }` when scope isn't "all".
 */
export async function scopeOf(action: Action, subjectName: Subject) {
  return scopeOfCtx(await getAbilityContext(), action, subjectName);
}

/** Like requirePermission, but unit-scoped access isn't enough. */
export async function requireOrgWide(action: Action, subjectName: Subject) {
  const session = await requireAdmin();
  if ((await scopeOf(action, subjectName)) !== "all") deny(action, subjectName);
  await assertNotPreviewing(action);
  return session;
}

/** Managing roles and admin access is reserved for Super Admins. */
export async function requireSuperAdmin() {
  const session = await requireAdmin();
  if (!isSuperAdmin(await getAbilityContext())) deny("manage", "AdminRole");
  return session;
}

const ADMIN_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

// Sign-in methods that REQUIRE 2FA enrolment. Google has its own MFA and
// magic links require email-account access, so neither needs an extra factor.
// Anything else (currently only "credential" / email+password) is forced.
const TWO_FACTOR_EXEMPT_METHODS = new Set(["google", "magic-link"]);

/**
 * Require any admin-side role (used to gate the entire /admin tree).
 * Enforces:
 *  1. The user is signed in.
 *  2. The user has at least one admin role.
 *  3. The session is no older than 12 hours — admins re-authenticate daily.
 *  4. (Unless `requireTwoFactor: false`) admins who signed in via email +
 *     password must have 2FA enabled. Admins who signed in via Google or
 *     magic link bypass this — those methods already imply a strong factor.
 */
export async function requireAdmin(
  options: { requireTwoFactor?: boolean } = {},
) {
  const session = await requireAuth("/admin/login");
  const ctx = await getAbilityContext();
  if (!hasAdminAccess(ctx)) redirect("/unauthorized");

  // Force admin re-auth if the session is older than 12h.
  const sessionStart = session.session?.createdAt
    ? new Date(session.session.createdAt).getTime()
    : null;
  if (
    sessionStart &&
    Date.now() - sessionStart > ADMIN_SESSION_MAX_AGE_MS
  ) {
    redirect("/admin/login?expired=1");
  }

  // Enforce 2FA only for credential sign-ins.
  if (options.requireTwoFactor !== false) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorEnabled: true, lastLoginMethod: true },
    });
    const method = user?.lastLoginMethod ?? null;
    const exempt = method !== null && TWO_FACTOR_EXEMPT_METHODS.has(method);
    if (!exempt && !user?.twoFactorEnabled) {
      redirect("/auth/two-factor-setup");
    }
  }

  return session;
}

/**
 * Boolean variant of requirePermission — no redirect.
 */
export async function can<S extends Subject>(
  action: Action,
  subjectName: S,
  instance?: Record<string, unknown>,
): Promise<boolean> {
  return check(await getAbility(), action, subjectName, instance);
}

/**
 * With an instance, CASL evaluates conditions against it. Without one, CASL
 * would pass ANY conditional rule — so "may read their own Member record"
 * would unlock the whole directory. Type-level checks therefore only count
 * unconditional rules and unit-scoped ones (callers narrow those with
 * `scopeOf`); self-only rules need the instance.
 */
function check(
  ability: AppAbility,
  action: Action,
  subjectName: Subject,
  instance?: Record<string, unknown>,
): boolean {
  if (instance) {
    return ability.can(action, casl_subject(subjectName, { ...instance }) as never);
  }
  return ability
    .rulesFor(action, subjectName)
    .some((r) => !r.inverted && (!r.conditions || "unitIds" in r.conditions));
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSessionOrNull();
  return !!session?.user;
}

export async function isAdmin(): Promise<boolean> {
  return hasAdminAccess(await getAbilityContext());
}
