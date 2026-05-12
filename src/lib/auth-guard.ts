import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { subject as casl_subject } from "@casl/ability";
import { getServerAuthSession } from "./auth";
import { prisma } from "./database";
import {
  ANONYMOUS_CONTEXT,
  defineAbilityFor,
  parseRoles,
  hasAnyAdminRole,
  type AbilityContext,
  type AppAbility,
} from "./rbac";
import type { Action, Subject } from "./rbac/permissions";

/** Legacy alias kept for back-compat with existing call sites. */
export type UserRole = "user" | "admin";

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
 * Returns ANONYMOUS_CONTEXT if not signed in.
 */
export const getAbilityContext = cache(async (): Promise<AbilityContext> => {
  const session = await getServerAuthSession();
  if (!session?.user) return ANONYMOUS_CONTEXT;

  const roles = parseRoles(session.user.role);

  // Only query unit scoping if at least one role needs it.
  const needsScopes = roles.includes("unit_leader");
  const scopedUnitIds = needsScopes
    ? (
        await prisma.userUnitRole.findMany({
          where: { userId: session.user.id },
          select: { unitId: true },
        })
      ).map((u) => u.unitId)
    : [];

  return { userId: session.user.id, roles, scopedUnitIds };
});

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
  const allowed = instance
    ? ability.can(action, casl_subject(subjectName, instance) as never)
    : ability.can(action, subjectName);
  if (!allowed) redirect("/unauthorized");
  return session;
}

/**
 * Require any admin-side role (used to gate the entire /admin tree).
 * Kept as a thin wrapper for legacy call sites.
 */
export async function requireAdmin() {
  const session = await requireAuth("/admin/login");
  const ctx = await getAbilityContext();
  if (!hasAnyAdminRole(ctx.roles)) redirect("/unauthorized");
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
  const ability = await getAbility();
  return instance
    ? ability.can(action, casl_subject(subjectName, instance) as never)
    : ability.can(action, subjectName);
}

/**
 * Check if the current user has a given legacy role. Kept for back-compat.
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const ctx = await getAbilityContext();
  if (role === "admin") return ctx.roles.includes("super_admin");
  return ctx.roles.includes("member");
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSessionOrNull();
  return !!session?.user;
}

export async function isAdmin(): Promise<boolean> {
  const ctx = await getAbilityContext();
  return hasAnyAdminRole(ctx.roles);
}
