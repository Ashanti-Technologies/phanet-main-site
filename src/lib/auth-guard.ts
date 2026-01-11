import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, getServerAuthSession } from "./auth";

export type UserRole = "user" | "admin";

/**
 * Get the current session or null if not authenticated
 */
export async function getSessionOrNull() {
  return getServerAuthSession();
}

/**
 * Require authentication - throws redirect if not authenticated
 * @param redirectTo - URL to redirect to after login (default: current path)
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
 * Require admin role - throws redirect if not admin
 */
export async function requireAdmin() {
  const session = await requireAuth("/admin/login");

  if (session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  return session;
}

/**
 * Check if user has a specific role
 */
export async function hasRole(role: UserRole): Promise<boolean> {
  const session = await getSessionOrNull();
  return session?.user?.role === role;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSessionOrNull();
  return !!session?.user;
}

/**
 * Check if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole("admin");
}
