import { requireAdmin } from "@/lib/auth-guard";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  LogOut,
  Menu,
  CalendarDays,
  FileText,
  Home,
  MessageSquare,
  Users,
  HeartHandshake,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/app/components/ui/sheet";

export const dynamic = "force-dynamic";

const navigation = [
  {
    label: "Overview",
    items: [{ name: "Dashboard", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Content",
    items: [
      { name: "Events", href: "/admin/content/events", icon: CalendarDays },
      { name: "Pages", href: "/admin/content/pages", icon: FileText },
      { name: "Homepage", href: "/admin/content/homepage", icon: Home },
      { name: "Sermons", href: "/admin/content/sermons", icon: MessageSquare },
    ],
  },
  {
    label: "Fundraising",
    items: [{ name: "Projects", href: "/admin/projects", icon: FolderKanban }],
  },
  {
    label: "Ministry",
    items: [
      { name: "Prayer Requests", href: "/admin/prayer-requests", icon: HeartHandshake },
      { name: "Users", href: "/admin/users", icon: Users },
      { name: "Church Units", href: "/admin/settings/church-units", icon: Settings },
    ],
  },
];

function Sidebar({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <span className="text-xl font-bold text-mikado-yellow">PHANET</span>
        <span className="text-sm text-muted-foreground">Admin</span>
      </div>
      <nav className="flex-1 space-y-5 p-4">
        {navigation.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
            {group.items.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.name}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t p-4">
        <form action="/api/auth/sign-out" method="POST">
          <Button variant="ghost" className="w-full justify-start gap-2">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden w-64 flex-col border-r bg-card lg:flex" />

      {/* Mobile Header */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <Sidebar className="flex h-full flex-col" />
            </SheetContent>
          </Sheet>
          <span className="text-xl font-bold text-mikado-yellow">PHANET</span>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
