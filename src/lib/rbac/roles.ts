export const ROLES = {
  SUPER_ADMIN: "super_admin",
  PASTOR: "pastor",
  EDITOR: "editor",
  FINANCE: "finance",
  UNIT_LEADER: "unit_leader",
  MEMBER: "member",
} as const;

export type RoleKey = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLE_KEYS: RoleKey[] = Object.values(ROLES);

export const ROLE_DEFINITIONS: Record<
  RoleKey,
  { label: string; description: string; isAdminRole: boolean; requiresUnits: boolean }
> = {
  super_admin: {
    label: "Super Admin",
    description: "Full access to everything",
    isAdminRole: true,
    requiresUnits: false,
  },
  pastor: {
    label: "Pastor",
    description: "Full read/write on members, messaging, and pastoral care",
    isAdminRole: true,
    requiresUnits: false,
  },
  editor: {
    label: "Editor",
    description: "Manage CMS content (events, pages, sermons, homepage)",
    isAdminRole: true,
    requiresUnits: false,
  },
  finance: {
    label: "Finance",
    description: "Manage fundraising projects, commitments, and payments",
    isAdminRole: true,
    requiresUnits: false,
  },
  unit_leader: {
    label: "Unit Leader",
    description: "Manage members in assigned church units",
    isAdminRole: true,
    requiresUnits: true,
  },
  member: {
    label: "Member",
    description: "Self-service portal access only",
    isAdminRole: false,
    requiresUnits: false,
  },
};

const ROLE_SET = new Set<RoleKey>(ALL_ROLE_KEYS);

/**
 * Parse the comma-separated role string stored on User.role into role keys.
 * Maps legacy "admin" → "super_admin" and legacy "user" → "member".
 */
export function parseRoles(raw: string | null | undefined): RoleKey[] {
  if (!raw) return [];
  const out = new Set<RoleKey>();
  for (const part of raw.split(",")) {
    const key = part.trim().toLowerCase();
    if (!key) continue;
    if (key === "admin") out.add(ROLES.SUPER_ADMIN);
    else if (key === "user") out.add(ROLES.MEMBER);
    else if (ROLE_SET.has(key as RoleKey)) out.add(key as RoleKey);
  }
  return Array.from(out);
}

/** Serialize role keys back to the comma-separated form Better Auth stores. */
export function serializeRoles(roles: RoleKey[]): string {
  return Array.from(new Set(roles)).join(",");
}

/** True if any role in the list is an admin-side role (i.e. should access /admin). */
export function hasAnyAdminRole(roles: RoleKey[]): boolean {
  return roles.some((r) => ROLE_DEFINITIONS[r]?.isAdminRole);
}
