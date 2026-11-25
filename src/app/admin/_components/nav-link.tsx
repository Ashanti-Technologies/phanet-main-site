"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  FileText,
  FolderKanban,
  HeartHandshake,
  Home,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
  UsersRound,
  Tag as TagIcon,
  Upload,
  HomeIcon,
  Send,
  FileType,
  Inbox,
  CalendarCheck,
  ClipboardList,
  BarChart3,
  Wallet,
  ArrowDownToLine,
  Receipt,
  PiggyBank,
  Target,
  ScrollText,
  Repeat,
  Plug,
  Library,
  Images,
  Quote,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NavIconName =
  | "dashboard"
  | "events"
  | "pages"
  | "homepage"
  | "testimonials"
  | "guests"
  | "sermons"
  | "library"
  | "gallery"
  | "projects"
  | "prayerRequests"
  | "users"
  | "churchUnits"
  | "members"
  | "households"
  | "tags"
  | "import"
  | "messages"
  | "templates"
  | "batches"
  | "services"
  | "tasks"
  | "reports"
  | "finance"
  | "income"
  | "expenses"
  | "funds"
  | "budgets"
  | "statements"
  | "monthly"
  | "integrations";

const icons: Record<NavIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  events: CalendarDays,
  pages: FileText,
  homepage: Home,
  testimonials: Quote,
  sermons: MessageSquare,
  library: Library,
  gallery: Images,
  projects: FolderKanban,
  prayerRequests: HeartHandshake,
  guests: UserPlus,
  users: Users,
  churchUnits: Settings,
  members: UsersRound,
  households: HomeIcon,
  tags: TagIcon,
  import: Upload,
  messages: Send,
  templates: FileType,
  batches: Inbox,
  services: CalendarCheck,
  tasks: ClipboardList,
  reports: BarChart3,
  finance: Wallet,
  income: ArrowDownToLine,
  expenses: Receipt,
  funds: PiggyBank,
  budgets: Target,
  statements: ScrollText,
  monthly: Repeat,
  integrations: Plug,
};

type Props = {
  href: string;
  name: string;
  icon: NavIconName;
  exact?: boolean;
};

export function NavLink({ href, name, icon, exact }: Props) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  const Icon = icons[icon];

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-sidebar-foreground" : "text-sidebar-foreground/60",
        )}
        aria-hidden="true"
      />
      <span className="truncate">{name}</span>
    </Link>
  );
}
