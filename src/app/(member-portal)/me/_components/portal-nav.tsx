"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HandHeart,
  Home,
  Sparkles,
  UserCircle2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Mark active for any path starting with this prefix (besides exact `/me`). */
  match?: string;
};

export const PORTAL_NAV: NavItem[] = [
  { href: "/me", label: "Home", icon: Home },
  { href: "/me/profile", label: "Profile", icon: UserCircle2, match: "/me/profile" },
  { href: "/me/giving", label: "Giving", icon: HandHeart, match: "/me/giving" },
  { href: "/me/connect", label: "Connect", icon: Sparkles, match: "/me/connect" },
];

function isActive(href: string, match: string | undefined, pathname: string) {
  if (href === "/me") return pathname === "/me";
  return pathname === href || (match ? pathname.startsWith(match) : false);
}

export function PortalDesktopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {PORTAL_NAV.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href, item.match, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-midnight-green text-mikado-yellow shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PortalMobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur md:hidden"
      aria-label="Member portal navigation"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {PORTAL_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.match, pathname);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium",
                  active
                    ? "text-midnight-green"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                    active && "bg-mikado-yellow/30",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
