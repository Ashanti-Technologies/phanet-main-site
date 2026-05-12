"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Command } from "cmdk";
import { authClient } from "@/lib/auth-client";
import {
  CalendarDays,
  FileText,
  FolderKanban,
  HeartHandshake,
  Home,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Monitor,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Users,
} from "lucide-react";

type Item = {
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  shortcut?: string;
  keywords?: string[];
};

type Group = {
  heading: string;
  items: Item[];
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(href: string) {
    return () => {
      setOpen(false);
      router.push(href);
    };
  }

  async function handleSignOut() {
    setOpen(false);
    await authClient.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  const groups: Group[] = [
    {
      heading: "Navigation",
      items: [
        {
          label: "Dashboard",
          icon: <LayoutDashboard className="h-4 w-4" />,
          onSelect: go("/admin"),
          keywords: ["home", "overview"],
        },
        {
          label: "Events",
          icon: <CalendarDays className="h-4 w-4" />,
          onSelect: go("/admin/content/events"),
        },
        {
          label: "Pages",
          icon: <FileText className="h-4 w-4" />,
          onSelect: go("/admin/content/pages"),
        },
        {
          label: "Homepage",
          icon: <Home className="h-4 w-4" />,
          onSelect: go("/admin/content/homepage"),
        },
        {
          label: "Sermons",
          icon: <MessageSquare className="h-4 w-4" />,
          onSelect: go("/admin/content/sermons"),
        },
        {
          label: "Projects",
          icon: <FolderKanban className="h-4 w-4" />,
          onSelect: go("/admin/projects"),
        },
        {
          label: "Prayer Requests",
          icon: <HeartHandshake className="h-4 w-4" />,
          onSelect: go("/admin/prayer-requests"),
          keywords: ["prayers", "requests"],
        },
        {
          label: "Users",
          icon: <Users className="h-4 w-4" />,
          onSelect: go("/admin/users"),
          keywords: ["members", "people"],
        },
        {
          label: "Church Units",
          icon: <Settings className="h-4 w-4" />,
          onSelect: go("/admin/settings/church-units"),
          keywords: ["settings"],
        },
      ],
    },
    {
      heading: "Quick actions",
      items: [
        {
          label: "New project",
          icon: <Plus className="h-4 w-4" />,
          onSelect: go("/admin/projects/new"),
          keywords: ["create", "add"],
        },
        {
          label: "New event",
          icon: <Plus className="h-4 w-4" />,
          onSelect: go("/admin/content/events/new"),
          keywords: ["create", "add"],
        },
        {
          label: "New page",
          icon: <Plus className="h-4 w-4" />,
          onSelect: go("/admin/content/pages/new"),
          keywords: ["create", "add"],
        },
      ],
    },
    {
      heading: "Preferences",
      items: [
        {
          label: "Light mode",
          icon: <Sun className="h-4 w-4" />,
          onSelect: () => {
            setTheme("light");
            setOpen(false);
          },
          keywords: ["theme"],
        },
        {
          label: "Dark mode",
          icon: <Moon className="h-4 w-4" />,
          onSelect: () => {
            setTheme("dark");
            setOpen(false);
          },
          keywords: ["theme"],
        },
        {
          label: "System theme",
          icon: <Monitor className="h-4 w-4" />,
          onSelect: () => {
            setTheme("system");
            setOpen(false);
          },
          keywords: ["theme", "auto"],
        },
      ],
    },
    {
      heading: "Account",
      items: [
        {
          label: "Sign out",
          icon: <LogOut className="h-4 w-4" />,
          onSelect: handleSignOut,
        },
      ],
    },
  ];

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command menu"
      shouldFilter
      className="fixed inset-0 z-50 grid place-items-start sm:place-items-center pt-24 sm:pt-0"
      overlayClassName="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      contentClassName="relative z-50 w-full max-w-lg mx-4 rounded-xl border bg-popover text-popover-foreground shadow-2xl overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
    >
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
        <Command.Input
          placeholder="Type a command or search…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <kbd className="hidden sm:inline-flex h-5 select-none items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ESC
        </kbd>
      </div>
      <Command.List className="max-h-80 overflow-y-auto p-1.5">
        <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
          No matches found.
        </Command.Empty>
        {groups.map((group) => (
          <Command.Group
            key={group.heading}
            heading={group.heading}
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground/70"
          >
            {group.items.map((item) => (
              <Command.Item
                key={item.label}
                value={[item.label, ...(item.keywords ?? [])].join(" ")}
                onSelect={item.onSelect}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <span className="text-muted-foreground">{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {item.shortcut && (
                  <kbd className="text-[10px] font-mono text-muted-foreground">
                    {item.shortcut}
                  </kbd>
                )}
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
      <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">↑↓</kbd>
          navigate
        </span>
        <span className="flex items-center gap-1.5">
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">↵</kbd>
          select
        </span>
        <span className="hidden sm:flex items-center gap-1.5">
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">⌘K</kbd>
          toggle
        </span>
      </div>
    </Command.Dialog>
  );
}

export function CommandTrigger() {
  function open() {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
        bubbles: true,
      }),
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open command menu"
      className="group hidden sm:flex h-9 items-center gap-2 rounded-md border bg-background px-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors min-w-[200px]"
    >
      <Search className="h-3.5 w-3.5" aria-hidden />
      <span className="flex-1 text-left">Search…</span>
      <kbd className="inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        <span>⌘</span>
        <span>K</span>
      </kbd>
    </button>
  );
}
