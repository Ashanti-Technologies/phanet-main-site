/**
 * Access-control checks. Run: pnpm tsx scripts/rbac-check.ts
 *
 * 1. Policy: builds abilities for sample grants and asserts who can do what.
 * 2. Coverage: every exported server action must make a real permission check
 *    (requireAdmin alone only proves "some admin"), unless it's on the public
 *    list below; admin pages/routes that query Prisma directly must check too.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { subject } from "@casl/ability";
import { defineAbilityFor, scopeOf, type Grant } from "../src/lib/rbac/abilities";
import { isUnitScopable, PERMISSIONS, summarizeAccess } from "../src/lib/rbac/catalog";
import { delegationProblem } from "../src/lib/rbac/delegation";

let failures = 0;
function expect(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error(`✗ ${msg}`);
  }
}

// ---------------------------------------------------------------- policy
const UNIT_A = "unit-a";
const UNIT_B = "unit-b";
const ctx = (grants: Grant[]) => ({ userId: "u1", grants });
const ability = (grants: Grant[]) => defineAbilityFor(ctx(grants));
/** Type-level check as auth-guard does it: only unconditional or unit rules count. */
const typeLevel = (grants: Grant[], action: string, subj: string) =>
  ability(grants)
    .rulesFor(action as never, subj as never)
    .some((r) => !r.inverted && (!r.conditions || "unitIds" in r.conditions));

const member = { permissions: [] as string[], unitId: null };
const superAdmin = { permissions: ["*"], unitId: null };
const editor = { permissions: ["content.view", "content.edit"], unitId: null };
const leaderA = { permissions: ["members.view", "members.edit", "care.view", "care.edit"], unitId: UNIT_A };
const finance = { permissions: ["finance.view", "finance.edit"], unitId: null };

// Plain members: their own record only, never the directory.
expect(!typeLevel([], "read", "Member"), "member cannot list the directory");
expect(ability([]).can("read", subject("Member", { userId: "u1" }) as never), "member reads own record");
expect(!ability([]).can("read", subject("Member", { userId: "u2" }) as never), "member can't read others");
expect(!typeLevel([], "read", "Commitment"), "member cannot list all pledges");
expect(!ability([]).can("access", "AdminPanel"), "member has no admin panel");
void member;

// Super admin
expect(ability([superAdmin]).can("manage", "AdminRole"), "super admin manages access");
expect(scopeOf(ctx([superAdmin]), "read", "Member") === "all", "super admin scope is all");

// Editor: content only
expect(typeLevel([editor], "update", "Event"), "editor edits events");
expect(!typeLevel([editor], "read", "Member"), "editor can't read members");
expect(!typeLevel([editor], "read", "EventRegistration"), "editor can't see attendees");
expect(!typeLevel([editor], "read", "Income"), "editor can't see finance");
expect(!ability([editor]).can("manage", "AdminRole"), "editor can't manage access");
expect(typeLevel([editor], "read", "Tag"), "any admin reads tag lookups");

// Unit leader scoped to A
const inA = { unitIds: [UNIT_A] };
const inB = { unitIds: [UNIT_B] };
expect(ability([leaderA]).can("update", subject("Member", { ...inA }) as never), "leader edits member in A");
expect(!ability([leaderA]).can("update", subject("Member", { ...inB }) as never), "leader can't edit member in B");
expect(!ability([leaderA]).can("update", subject("Member", { unitIds: [] }) as never), "leader can't edit unit-less member");
expect(!ability([leaderA]).can("delete", subject("Member", { ...inA }) as never), "leader can't delete (no members.delete)");
expect(ability([leaderA]).can("create", subject("Note", { ...inA, visibility: "GENERAL" }) as never), "leader writes general note in A");
expect(!ability([leaderA]).can("read", subject("Note", { ...inA, visibility: "PASTORAL" }) as never), "leader can't read pastoral notes");
expect(!typeLevel([leaderA], "read", "Household"), "scoping drops non-unit rules (households)");
expect(!typeLevel([leaderA], "approve", "Member"), "scoping drops approvals");
expect(JSON.stringify(scopeOf(ctx([leaderA]), "read", "Member")) === JSON.stringify([UNIT_A]), "leader scope is [A]");
expect(
  JSON.stringify(scopeOf(ctx([leaderA, { ...leaderA, unitId: UNIT_B }]), "read", "Member")) === JSON.stringify([UNIT_A, UNIT_B]),
  "two unit grants union",
);
expect(scopeOf(ctx([leaderA, { permissions: ["members.view"], unitId: null }]), "read", "Member") === "all", "org-wide grant wins");

// New guests (/new-here): chapter teams see and handle only their chapter's guests;
// national guests (no unit) need org-wide care access.
expect(JSON.stringify(scopeOf(ctx([leaderA]), "read", "Guest")) === JSON.stringify([UNIT_A]), "chapter team sees its guests");
expect(ability([leaderA]).can("update", subject("Guest", { unitIds: [UNIT_A] }) as never), "chapter team takes its guests");
expect(!ability([leaderA]).can("update", subject("Guest", { unitIds: [UNIT_B] }) as never), "not another chapter's guests");
expect(!ability([leaderA]).can("update", subject("Guest", { unitIds: [] }) as never), "not national guests");
expect(scopeOf(ctx([{ permissions: ["care.view"], unitId: null }]), "read", "Guest") === "all", "national team sees all guests");
expect(!typeLevel([editor], "read", "Guest"), "editor can't see guests");
expect(JSON.stringify(scopeOf(ctx([editor]), "read", "Member")) === "[]", "no grant → empty scope");

// Assigned tasks: anyone with admin access, own tasks only
expect(ability([editor]).can("update", subject("FollowUpTask", { assignedToId: "u1" }) as never), "assignee updates own task");
expect(!ability([editor]).can("update", subject("FollowUpTask", { assignedToId: "u2" }) as never), "not others' tasks");

// Finance: approve is separate
expect(typeLevel([finance], "update", "Expense"), "finance edits expenses");
expect(!typeLevel([finance], "approve", "Expense"), "edit doesn't imply approve");
expect(!typeLevel([finance], "export", "Income"), "edit doesn't imply export");

// Contact details: separate from viewing members, unit-limited like it
const viewerNoContact = { permissions: ["members.view"], unitId: null };
const leaderWithContact = { permissions: [...leaderA.permissions, "members.contact"], unitId: UNIT_A };
expect(JSON.stringify(scopeOf(ctx([viewerNoContact]), "read", "MemberContact")) === "[]", "members.view alone hides contact");
expect(JSON.stringify(scopeOf(ctx([leaderWithContact]), "read", "MemberContact")) === JSON.stringify([UNIT_A]), "contact limited to unit");
expect(ability([leaderWithContact]).can("read", subject("MemberContact", { ...inA }) as never), "contact visible in own unit");
expect(!ability([leaderWithContact]).can("read", subject("MemberContact", { ...inB }) as never), "contact hidden in other unit");
expect(scopeOf(ctx([superAdmin]), "read", "MemberContact") === "all", "super admin sees all contact");

// Delegation: unit-limited, scopable, separate from member edit
const delegateA = { permissions: [...leaderA.permissions, "access.delegate"], unitId: UNIT_A };
expect(isUnitScopable(delegateA.permissions), "delegate role is scopable");
expect(ability([delegateA]).can("create", subject("RoleAssignment", { ...inA }) as never), "delegate grants in own unit");
expect(!ability([delegateA]).can("create", subject("RoleAssignment", { ...inB }) as never), "delegate can't grant in other unit");
expect(!typeLevel([leaderA], "create", "RoleAssignment"), "leaders can't delegate without access.delegate");
expect(!ability([delegateA]).can("manage", "AdminRole"), "delegates can't edit roles");

const role = (permissions: string[], isSystem = false) => ({ name: "R", isSystem, permissions });
const dctx = ctx([delegateA]);
expect(delegationProblem(dctx, role(["members.view", "care.view"]), UNIT_A, "u2") === null, "delegate gives subset in own unit");
expect(delegationProblem(dctx, role(["members.view"]), UNIT_B, "u2") !== null, "delegate blocked in other unit");
expect(delegationProblem(dctx, role(["members.view"]), null, "u2") !== null, "delegate can't grant everywhere");
expect(delegationProblem(dctx, role(["members.view", "members.delete"]), UNIT_A, "u2") !== null, "delegate can't give more than they hold");
expect(delegationProblem(dctx, role(["content.edit"]), UNIT_A, "u2") !== null, "delegate can't give non-unit roles");
expect(delegationProblem(dctx, role(["*"], true), UNIT_A, "u2") !== null, "delegate can't give Super Admin");
expect(delegationProblem(dctx, role(["members.view"]), UNIT_A, "u1") !== null, "delegate can't change own access");
expect(delegationProblem(dctx, role(delegateA.permissions), UNIT_A, "u2") === null, "delegate may pass delegation on, within unit");
expect(delegationProblem(ctx([superAdmin]), role(["content.edit"]), null, "u1") === null, "super admin unrestricted here");

// Catalog sanity
expect(isUnitScopable(leaderA.permissions), "unit leader role is scopable");
expect(!isUnitScopable(editor.permissions), "editor role is not scopable");
expect(!isUnitScopable([]), "empty role is not scopable");
expect(summarizeAccess([{ permissions: ["*"], unit: null }]).everything, "summary: super admin = everything");
expect(
  summarizeAccess([{ permissions: leaderA.permissions, unit: "Youth" }]).areas.some((a) => a.parts.includes("View & edit — Youth only")),
  "summary names the unit",
);
for (const [key, def] of Object.entries(PERMISSIONS)) {
  expect(def.rules.length > 0, `${key} grants something`);
}

// -------------------------------------------------------------- coverage
const ROOT = join(__dirname, "..", "src");
const GUARD = /requirePermission\(|requireNotePermission\(|requireOrgWide\(|requireSuperAdmin\(|requireAccessManager\(|\bcan\(|\bguard\(/;

// Exported actions that are deliberately public or self-service (they check
// the session/ownership themselves). Adding to this list is a security decision.
const PUBLIC_ACTIONS = new Set([
  "access.hasAdminPanelAccess", // answers only for the caller
  "access.exitPreview", // only clears the caller's own preview cookie
  "church-units.getChurchUnits", // unit names for public forms
  "commitments.createCommitment", // public pledge form
  "commitments.getMyCommitments", // caller's own, by session
  "commitments.getThankYouWallData", // public wall, non-anonymous only
  "event-registrations.*", // public registration; admin ones are checked (see below)
  "guests.planFirstVisit", // public /new-here "Plan your first Sunday" form
  "guests.getFirstVisitOptions", // upcoming Sundays + chapter names for that form
  "gallery.requestTakedown", // signed-in self-service; hides the photo pending admin review
  "giving.*",
  "locations.*",
  "member-applications.submitMembershipApplication",
  "member-claim.*",
  "member-invites.getMemberInvitePreview", // token-gated
  "member-invites.acceptMemberInvite", // token-gated
  "member-portal.*",
  "pastoral.getMyTasks", // instance-checked on the caller
  "projects.getProjectById", // public project page
  "projects.getProjects", // public project list
  "projects.markProjectAsFulfilled", // delegates to updateProjectStatus
  "proof-uploads.getProofsByProject", // public proof gallery
]);
// Public modules still have admin-only exports; those must be checked.
const MUST_CHECK = new Set([
  "event-registrations.setAttendeeCheckIn",
  "event-registrations.recordEventPayment",
  "event-registrations.deleteEventRegistration",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

for (const file of readdirSync(join(ROOT, "actions")).filter((f) => f.endsWith(".ts"))) {
  const src = readFileSync(join(ROOT, "actions", file), "utf8");
  if (!src.includes('"use server"')) continue;
  const mod = file.replace(/\.ts$/, "");
  const parts = src.split(/\nexport async function /).slice(1);
  for (const part of parts) {
    const name = part.match(/^(\w+)/)?.[1] ?? "?";
    const isPublic = PUBLIC_ACTIONS.has(`${mod}.${name}`) || PUBLIC_ACTIONS.has(`${mod}.*`);
    if (isPublic && !MUST_CHECK.has(`${mod}.${name}`)) continue;
    const body = part.split(/\n(?:export |function |async function |const \w+ = )/)[0];
    expect(GUARD.test(body), `src/actions/${file}: ${name}() has no permission check`);
  }
}

for (const file of walk(join(ROOT, "app", "admin"))) {
  if (!/\/(page\.tsx|route\.ts)$/.test(file)) continue;
  const src = readFileSync(file, "utf8");
  if (src.includes("prisma.") && !GUARD.test(src)) {
    expect(false, `${file.slice(ROOT.length - 3)} queries Prisma without a permission check`);
  }
}

if (failures) {
  console.error(`\n${failures} access-control check(s) failed.`);
  process.exit(1);
}
console.log("✓ access control checks passed");
