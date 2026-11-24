import { can, getAbilityContext, requireAdmin } from "@/lib/auth-guard";
import { exitPreview } from "@/actions/access";
import { Eye } from "lucide-react";
import { ROUTE_NEEDS } from "./_components/admin-routes";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button, buttonVariants } from "@/app/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";
import { AdminThemeProvider } from "./_components/theme-provider";
import { ThemeToggle } from "./_components/theme-toggle";
import { UserMenu } from "./_components/user-menu";
import { NavLink } from "./_components/nav-link";
import type { NavIconName } from "./_components/nav-link";
import { Breadcrumbs } from "./_components/breadcrumbs";
import {
  CommandPalette,
  CommandTrigger,
} from "./_components/command-palette";

export const dynamic = "force-dynamic";

type NavItem = {
  name: string;
  href: string;
  icon: NavIconName;
  exact?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navigation: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        name: "Dashboard",
        href: "/admin",
        icon: "dashboard",
        exact: true,
      },
    ],
  },
  {
    label: "Content",
    items: [
      { name: "Events", href: "/admin/content/events", icon: "events" },
      { name: "Pages", href: "/admin/content/pages", icon: "pages" },
      { name: "Homepage", href: "/admin/content/homepage", icon: "homepage" },
      { name: "Sermons", href: "/admin/content/sermons", icon: "sermons" },
      { name: "Library", href: "/admin/content/library", icon: "library" },
    ],
  },
  {
    label: "Members",
    items: [
      { name: "Directory", href: "/admin/members", icon: "members", exact: true },
      {
        name: "Households",
        href: "/admin/members/households",
        icon: "households",
      },
      { name: "Services", href: "/admin/services", icon: "services" },
      { name: "Import", href: "/admin/members/import", icon: "import" },
    ],
  },
  {
    label: "Messages",
    items: [
      { name: "Compose", href: "/admin/messages/compose", icon: "messages" },
      {
        name: "Templates",
        href: "/admin/messages/templates",
        icon: "templates",
      },
      { name: "Batches", href: "/admin/messages/batches", icon: "batches" },
    ],
  },
  {
    label: "Finance",
    items: [
      { name: "Overview", href: "/admin/finance", icon: "finance", exact: true },
      { name: "Income", href: "/admin/finance/income", icon: "income" },
      { name: "Monthly gifts", href: "/admin/finance/monthly", icon: "monthly" },
      { name: "Expenses", href: "/admin/finance/expenses", icon: "expenses" },
      { name: "Budgets", href: "/admin/finance/budgets", icon: "budgets" },
      { name: "Statements", href: "/admin/finance/statements", icon: "statements" },
      { name: "Funds", href: "/admin/finance/funds", icon: "funds" },
      { name: "Projects", href: "/admin/projects", icon: "projects" },
    ],
  },
  {
    label: "Ministry",
    items: [
      {
        name: "My tasks",
        href: "/admin/tasks",
        icon: "tasks",
      },
      {
        name: "Prayer requests",
        href: "/admin/prayer-requests",
        icon: "prayerRequests",
      },
    ],
  },
  {
    label: "Reports",
    items: [
      { name: "Growth", href: "/admin/reports/growth", icon: "reports" },
      {
        name: "Demographics",
        href: "/admin/reports/demographics",
        icon: "reports",
      },
      {
        name: "Engagement",
        href: "/admin/reports/engagement",
        icon: "reports",
      },
    ],
  },
  {
    label: "Settings",
    items: [
      { name: "Admin access", href: "/admin/users", icon: "users" },
      {
        name: "Two-factor",
        href: "/auth/two-factor-setup",
        icon: "users",
      },
      {
        name: "Church units",
        href: "/admin/settings/church-units",
        icon: "churchUnits",
      },
      { name: "Tags", href: "/admin/settings/tags", icon: "tags" },
      { name: "Integrations", href: "/admin/settings/integrations", icon: "integrations" },
    ],
  },
];

function Brand() {
  return (
    <Link
      href="/admin"
      className="flex items-center gap-2"
      aria-label="PHANET Admin"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-midnight-green text-mikado-yellow text-xs font-bold tracking-tight dark:bg-mikado-yellow dark:text-midnight-green">
        P
      </span>
      <span className="text-sm font-semibold tracking-tight">PHANET</span>
      <span className="text-xs text-muted-foreground font-medium">Admin</span>
    </Link>
  );
}

/** Hrefs the current user may open (non-admin links like 2FA are always in). */
async function allowedHrefs(): Promise<string[]> {
  const entries = Object.entries(ROUTE_NEEDS);
  const ok = await Promise.all(entries.map(([, [action, subject]]) => can(action, subject)));
  return entries.filter((_, i) => ok[i]).map(([href]) => href);
}

function visibleNavigation(allowed: string[]): NavGroup[] {
  return navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !(item.href in ROUTE_NEEDS) || allowed.includes(item.href)),
    }))
    .filter((group) => group.items.length > 0);
}

function SidebarBody({ groups }: { groups: NavGroup[] }) {
  return (
    <>
      <div className="flex h-14 items-center border-b border-sidebar-border px-5">
        <Brand />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-2.5 mb-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.name}>
                    <NavLink
                      href={item.href}
                      name={item.name}
                      icon={item.icon}
                      exact={item.exact}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <p className="text-xs text-sidebar-foreground/50">
          v1.0 · Phanerosis Network
        </p>
      </div>
    </>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  const { preview } = await getAbilityContext();
  const allowed = await allowedHrefs();
  const groups = visibleNavigation(allowed);

  return (
    <AdminThemeProvider>
      <div className="min-h-screen bg-background">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
          <SidebarBody groups={groups} />
        </aside>

        <div className="min-w-0 lg:pl-60">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 backdrop-blur px-4 sm:px-6">
            {/* Mobile menu trigger */}
            <Sheet>
              <SheetTrigger
                type="button"
                className={buttonVariants({
                  variant: "ghost",
                  size: "icon",
                  className: "lg:hidden -ml-2 h-9 w-9",
                })}
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-64 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border"
              >
                <SheetTitle className="sr-only">Admin navigation</SheetTitle>
                <SidebarBody groups={groups} />
              </SheetContent>
            </Sheet>

            <div className="lg:hidden">
              <Brand />
            </div>

            <div className="hidden lg:block">
              <Breadcrumbs />
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <CommandTrigger />
              <ThemeToggle />
              <div className="mx-1 h-5 w-px bg-border hidden sm:block" />
              <UserMenu
                name={session.user.name ?? "Admin"}
                email={session.user.email ?? ""}
                image={session.user.image}
              />
            </div>
          </header>

          <CommandPalette allowed={allowed} />

          {preview && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm sm:px-6">
              <p className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-amber-600" />
                Viewing as <span className="font-medium">{preview.name}</span> — you see what they see. Changes are turned off.
              </p>
              <form action={exitPreview}>
                <Button type="submit" size="sm" variant="outline">Exit preview</Button>
              </form>
            </div>
          )}

          <main className="flex-1 overflow-x-hidden">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminThemeProvider>
  );
}
