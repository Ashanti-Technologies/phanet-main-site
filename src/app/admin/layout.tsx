import { requireAdmin } from "@/lib/auth-guard";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/app/components/ui/sheet";
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
    ],
  },
  {
    label: "Fundraising",
    items: [{ name: "Projects", href: "/admin/projects", icon: "projects" }],
  },
  {
    label: "Ministry",
    items: [
      {
        name: "Prayer Requests",
        href: "/admin/prayer-requests",
        icon: "prayerRequests",
      },
      { name: "Users", href: "/admin/users", icon: "users" },
      {
        name: "Church Units",
        href: "/admin/settings/church-units",
        icon: "churchUnits",
      },
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
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background text-xs font-bold tracking-tight">
        P
      </span>
      <span className="text-sm font-semibold tracking-tight">PHANET</span>
      <span className="text-xs text-muted-foreground font-medium">Admin</span>
    </Link>
  );
}

function SidebarBody() {
  return (
    <>
      <div className="flex h-14 items-center border-b border-sidebar-border px-5">
        <Brand />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-6">
          {navigation.map((group) => (
            <div key={group.label}>
              <p className="px-2.5 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/50">
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
        <p className="text-[11px] text-sidebar-foreground/50">
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

  return (
    <AdminThemeProvider>
      <div className="flex min-h-screen bg-background">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
          <SidebarBody />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 backdrop-blur px-4 sm:px-6">
            {/* Mobile menu trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden -ml-2 h-9 w-9"
                  aria-label="Open navigation"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-64 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border"
              >
                <SidebarBody />
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

          <CommandPalette />

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
