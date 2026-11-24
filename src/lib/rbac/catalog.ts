import type { Action, Subject } from "./permissions";

/**
 * The permission catalog. Roles (stored in the DB) are just lists of these
 * keys, so the DB can combine permissions but never invent one — only code
 * can enforce a permission.
 *
 * `unit: true` rules still apply when a role is assigned for a single church
 * unit, narrowed to records in that unit (the checked instance's `unitIds`).
 * Every other rule is dropped for unit-scoped assignments, so scoping a role
 * can only ever take access away.
 */
export type Rule = {
  action: Action | Action[];
  subject: Subject | Subject[];
  conditions?: Record<string, unknown>;
  unit?: boolean;
};

export type Level = "view" | "edit" | "advanced";

export type PermissionDef = {
  key: string;
  area: AreaKey;
  label: string;
  level: Level;
  rules: Rule[];
};

export const AREAS = {
  content: { label: "Website content", hint: "Events, pages, sermons, homepage" },
  events: { label: "Event registrations", hint: "Registrations, check-in, rooms" },
  members: { label: "Members", hint: "Directory and households" },
  care: { label: "Pastoral care", hint: "Visits, follow-up tasks, notes" },
  prayer: { label: "Prayer requests", hint: "Requests sent from the website" },
  services: { label: "Services & attendance", hint: "Services and check-in" },
  messages: { label: "Messaging", hint: "Templates and sending" },
  finance: { label: "Finance", hint: "Income, expenses, budgets, projects" },
  reports: { label: "Reports", hint: "Dashboard, growth, demographics, engagement" },
  settings: { label: "Settings", hint: "Church units and tags" },
  access: { label: "Admin access", hint: "Give unit roles to people in their unit" },
} as const;

export type AreaKey = keyof typeof AREAS;
export const AREA_KEYS = Object.keys(AREAS) as AreaKey[];

const CONTENT: Subject[] = ["Event", "ContentPage", "Sermon", "Publication", "HomepageSection", "MediaAsset"];
const WRITE: Action[] = ["create", "update", "delete"];

const DEFS: PermissionDef[] = [
  // Content
  { key: "content.view", area: "content", level: "view", label: "View content", rules: [{ action: "read", subject: CONTENT }] },
  { key: "content.edit", area: "content", level: "edit", label: "Create, edit and delete content", rules: [{ action: WRITE, subject: CONTENT }] },

  // Event registrations
  { key: "events.view", area: "events", level: "view", label: "View events and registrations", rules: [{ action: "read", subject: ["Event", "EventRegistration"] }] },
  { key: "events.manage", area: "events", level: "edit", label: "Manage registrations, check-in, rooms and payments", rules: [{ action: WRITE, subject: "EventRegistration" }] },
  { key: "events.export", area: "events", level: "advanced", label: "Export registration lists", rules: [{ action: "export", subject: "EventRegistration" }] },

  // Members
  {
    key: "members.view", area: "members", level: "view", label: "View members",
    rules: [{ action: "read", subject: "Member", unit: true }, { action: "read", subject: "Household" }],
  },
  {
    key: "members.edit", area: "members", level: "edit", label: "Add and edit members, approve applications, send invites",
    rules: [
      { action: ["create", "update"], subject: "Member", unit: true },
      { action: "approve", subject: "Member" },
      { action: WRITE, subject: "Household" },
      { action: "create", subject: "MemberInvite" },
    ],
  },
  {
    key: "members.contact", area: "members", level: "view", label: "See contact details (phone, email, WhatsApp, address)",
    rules: [{ action: "read", subject: "MemberContact", unit: true }],
  },
  { key: "members.delete", area: "members", level: "advanced", label: "Delete members", rules: [{ action: "delete", subject: "Member", unit: true }] },
  { key: "members.import", area: "members", level: "advanced", label: "Import members from a spreadsheet", rules: [{ action: "import", subject: "Member" }] },
  { key: "members.export", area: "members", level: "advanced", label: "Export member data", rules: [{ action: "export", subject: "Member" }] },

  // Pastoral care (instances carry the member's unitIds)
  {
    key: "care.view", area: "care", level: "view", label: "View visits, tasks and general notes",
    rules: [
      { action: "read", subject: ["Visitation", "FollowUpTask"], unit: true },
      { action: "read", subject: "Note", conditions: { visibility: "GENERAL" }, unit: true },
    ],
  },
  {
    key: "care.edit", area: "care", level: "edit", label: "Log visits, assign tasks, write general notes",
    rules: [
      { action: WRITE, subject: ["Visitation", "FollowUpTask"], unit: true },
      { action: WRITE, subject: "Note", conditions: { visibility: "GENERAL" }, unit: true },
    ],
  },
  {
    key: "care.pastoral", area: "care", level: "advanced", label: "Read and write confidential pastoral notes",
    rules: [{ action: ["read", ...WRITE], subject: "Note", conditions: { visibility: "PASTORAL" }, unit: true }],
  },

  // Prayer
  { key: "prayer.view", area: "prayer", level: "view", label: "Read prayer requests", rules: [{ action: "read", subject: "PrayerRequest" }] },
  { key: "prayer.manage", area: "prayer", level: "edit", label: "Update and delete prayer requests", rules: [{ action: ["update", "delete"], subject: "PrayerRequest" }] },

  // Services
  { key: "services.view", area: "services", level: "view", label: "View services and attendance", rules: [{ action: "read", subject: ["Service", "Attendance"] }] },
  { key: "services.checkin", area: "services", level: "edit", label: "Check people in", rules: [{ action: ["create", "delete"], subject: "Attendance" }] },
  { key: "services.manage", area: "services", level: "edit", label: "Create and edit services", rules: [{ action: WRITE, subject: "Service" }] },

  // Messaging
  { key: "messages.view", area: "messages", level: "view", label: "View templates and sent batches", rules: [{ action: "read", subject: ["MessageTemplate", "MessageBatch"] }] },
  { key: "messages.edit", area: "messages", level: "edit", label: "Edit templates", rules: [{ action: WRITE, subject: "MessageTemplate" }] },
  { key: "messages.send", area: "messages", level: "advanced", label: "Send messages to members", rules: [{ action: "send", subject: "Message" }] },

  // Finance
  {
    key: "finance.view", area: "finance", level: "view", label: "View finances, projects and pledges",
    rules: [{
      action: "read",
      subject: ["Fund", "Income", "Expense", "ExpenseCategory", "Budget", "Project", "Commitment", "PaymentIntent", "ProofUpload"],
    }],
  },
  {
    key: "finance.edit", area: "finance", level: "edit", label: "Record income and expenses, manage budgets, funds and projects",
    rules: [
      { action: ["create", "update"], subject: ["Income", "Expense", "Commitment", "PaymentIntent"] },
      { action: WRITE, subject: ["Project", "ProofUpload", "Fund", "ExpenseCategory", "Budget"] },
    ],
  },
  { key: "finance.approve", area: "finance", level: "advanced", label: "Approve and mark expenses paid", rules: [{ action: "approve", subject: "Expense" }] },
  { key: "finance.export", area: "finance", level: "advanced", label: "Export financial data", rules: [{ action: "export", subject: ["Income", "Commitment"] }] },

  // Reports
  { key: "reports.view", area: "reports", level: "view", label: "View the dashboard and reports", rules: [{ action: "read", subject: "Report" }] },
  { key: "reports.export", area: "reports", level: "advanced", label: "Export reports", rules: [{ action: "export", subject: "Report" }] },

  // Settings
  { key: "settings.units", area: "settings", level: "edit", label: "Manage church units", rules: [{ action: WRITE, subject: "ChurchUnit" }] },
  { key: "settings.tags", area: "settings", level: "edit", label: "Manage tags", rules: [{ action: WRITE, subject: "Tag" }] },

  // Delegation: bounded in src/actions/access.ts — only roles whose permissions
  // the delegate holds in that unit, only for that unit, only to its members.
  {
    key: "access.delegate", area: "access", level: "advanced",
    label: "Give and remove unit roles for members of their unit (never more than they have)",
    rules: [{ action: ["create", "delete"], subject: "RoleAssignment", unit: true }],
  },
];

export const PERMISSIONS: Record<string, PermissionDef> = Object.fromEntries(
  DEFS.map((d) => [d.key, d]),
);
export const PERMISSION_KEYS = DEFS.map((d) => d.key);
export const ALL = "*";

export function permissionsInArea(area: AreaKey): PermissionDef[] {
  return DEFS.filter((d) => d.area === area);
}

export type AreaLevel = "none" | "view" | "edit" | "full" | "custom";

const LEVEL_RANK: Record<Level, number> = { view: 1, edit: 2, advanced: 3 };
const PRESET_RANK: Record<Exclude<AreaLevel, "none" | "custom">, number> = { view: 1, edit: 2, full: 3 };

/** Keys an area preset grants: View ⊂ Edit ⊂ Full. */
export function presetKeys(area: AreaKey, level: AreaLevel): string[] {
  if (level === "none" || level === "custom") return [];
  return permissionsInArea(area)
    .filter((d) => LEVEL_RANK[d.level] <= PRESET_RANK[level])
    .map((d) => d.key);
}

/** Which preset (if any) exactly matches the keys a role holds in an area. */
export function areaLevel(area: AreaKey, keys: readonly string[]): AreaLevel {
  if (keys.includes(ALL)) return "full";
  const held = new Set(permissionsInArea(area).map((d) => d.key).filter((k) => keys.includes(k)));
  if (held.size === 0) return "none";
  for (const level of ["view", "edit", "full"] as const) {
    const preset = presetKeys(area, level);
    if (preset.length === held.size && preset.every((k) => held.has(k))) return level;
  }
  return "custom";
}

/**
 * A role can be limited to a unit only if every permission in it still means
 * something there; otherwise scoping would silently drop parts of the role.
 */
export function isUnitScopable(keys: readonly string[]): boolean {
  return (
    keys.length > 0 &&
    keys.every((k) => PERMISSIONS[k]?.rules.some((r) => r.unit))
  );
}

/** Drop unknown keys; "*" stays only on its own. */
export function cleanPermissionKeys(keys: readonly string[]): string[] {
  if (keys.includes(ALL)) return [ALL];
  return PERMISSION_KEYS.filter((k) => keys.includes(k));
}

/** Plain-English labels of the permissions that grant `action` on `subject`. */
export function permissionsGranting(action: string, subject: string): PermissionDef[] {
  return DEFS.filter((d) =>
    d.rules.some((r) => ruleMatches(r, action, subject)),
  );
}

export function ruleMatches(rule: Rule, action: string, subject: string): boolean {
  const actions: string[] = Array.isArray(rule.action) ? rule.action : [rule.action];
  const subjects: string[] = Array.isArray(rule.subject) ? rule.subject : [rule.subject];
  return (
    (actions.includes(action) || actions.includes("manage")) &&
    (subjects.includes(subject) || subjects.includes("all"))
  );
}

const LEVEL_LABEL: Record<Exclude<AreaLevel, "none">, string> = {
  view: "View",
  edit: "View & edit",
  full: "Full",
  custom: "Some",
};

export type AccessSummary = {
  everything: boolean;
  areas: { area: AreaKey; label: string; parts: string[] }[];
  none: string[];
};

/**
 * Plain-English "what can they do" for a set of grants, e.g.
 * Members: "View & edit — Youth Ministry only". `unit` is the unit's name.
 */
export function summarizeAccess(
  grants: { permissions: readonly string[]; unit: string | null }[],
): AccessSummary {
  const everything = grants.some((g) => g.unit === null && g.permissions.includes(ALL));
  if (everything) return { everything, areas: [], none: [] };
  const areas: AccessSummary["areas"] = [];
  const none: string[] = [];
  for (const area of AREA_KEYS) {
    const parts = new Set<string>();
    for (const g of grants) {
      const level = areaLevel(area, g.permissions);
      if (level === "none") continue;
      parts.add(`${LEVEL_LABEL[level]}${g.unit ? ` — ${g.unit} only` : ""}`);
    }
    if (parts.size) areas.push({ area, label: AREAS[area].label, parts: [...parts] });
    else none.push(AREAS[area].label);
  }
  return { everything, areas, none };
}
