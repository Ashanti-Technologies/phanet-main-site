import type { Action, Subject } from "@/lib/rbac/permissions";

/**
 * What each admin page needs, so the sidebar and command palette only show
 * links that will actually open. Keep it in step with the page's own
 * requirePermission — this map is for display, the page check is the guard.
 */
export const ROUTE_NEEDS: Record<string, [Action, Subject]> = {
  "/admin": ["access", "AdminPanel"],
  "/admin/content/events": ["read", "Event"],
  "/admin/content/events/new": ["create", "Event"],
  "/admin/content/pages": ["read", "ContentPage"],
  "/admin/content/pages/new": ["create", "ContentPage"],
  "/admin/content/homepage": ["read", "HomepageSection"],
  "/admin/content/sermons": ["read", "Sermon"],
  "/admin/members": ["read", "Member"],
  "/admin/members/households": ["read", "Household"],
  "/admin/members/import": ["import", "Member"],
  "/admin/services": ["read", "Service"],
  "/admin/messages/compose": ["send", "Message"],
  "/admin/messages/templates": ["read", "MessageTemplate"],
  "/admin/messages/batches": ["read", "MessageBatch"],
  "/admin/finance": ["read", "Income"],
  "/admin/finance/income": ["read", "Income"],
  "/admin/finance/income/new": ["create", "Income"],
  "/admin/finance/monthly": ["read", "Income"],
  "/admin/finance/expenses": ["read", "Expense"],
  "/admin/finance/expenses/new": ["create", "Expense"],
  "/admin/finance/budgets": ["read", "Budget"],
  "/admin/finance/statements": ["read", "Income"],
  "/admin/finance/funds": ["read", "Fund"],
  "/admin/projects": ["read", "Project"],
  "/admin/projects/new": ["create", "Project"],
  "/admin/tasks": ["access", "AdminPanel"],
  "/admin/prayer-requests": ["read", "PrayerRequest"],
  "/admin/reports/growth": ["read", "Report"],
  "/admin/reports/demographics": ["read", "Report"],
  "/admin/reports/engagement": ["read", "Report"],
  "/admin/users": ["create", "RoleAssignment"], // Super Admins + unit delegates
  "/admin/settings/church-units": ["update", "ChurchUnit"],
  "/admin/settings/tags": ["update", "Tag"],
  "/admin/settings/integrations": ["manage", "AdminRole"], // Super Admins only
};
