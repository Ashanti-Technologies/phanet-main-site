"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MotionConfig } from "motion/react";
import {
  HandHeart,
  Home,
  Sparkles,
  UserCircle2,
  type LucideIcon,
} from "lucide-react";
import {
  Highlight,
  HighlightItem,
} from "@/app/components/animate-ui/primitives/effects/highlight";

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

function useActiveHref() {
  const pathname = usePathname();
  return PORTAL_NAV.find((i) => isActive(i.href, i.match, pathname))?.href ?? null;
}

const pillSpring = { type: "spring", bounce: 0.18, duration: 0.5 } as const;

// animate-ui Highlight: `value` follows the route; its built-in click handling
// moves the pill (and flips `data-active` on the link) the instant you tap.
export function PortalDesktopNav() {
  const activeHref = useActiveHref();
  return (
    <MotionConfig reducedMotion="user">
      <nav className="hidden items-center gap-1 rounded-full border border-border/40 bg-card/60 p-1 md:flex">
        <Highlight
          controlledItems
          value={activeHref}
          transition={pillSpring}
          className="inset-0 rounded-full bg-midnight-green shadow-(--shadow-soft)"
        >
          {PORTAL_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <HighlightItem key={item.href} value={item.href}>
                <Link
                  href={item.href}
                  aria-current={item.href === activeHref ? "page" : undefined}
                  className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground data-[active=true]:text-mikado-yellow"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </HighlightItem>
            );
          })}
        </Highlight>
      </nav>
    </MotionConfig>
  );
}

export function PortalMobileNav() {
  const activeHref = useActiveHref();
  return (
    <MotionConfig reducedMotion="user">
      <nav
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 md:hidden"
        aria-label="Member portal navigation"
      >
        <ul className="mx-auto flex max-w-md items-stretch gap-1 rounded-[1.25rem] border border-border/50 bg-card/85 p-1.5 shadow-(--shadow-float) backdrop-blur-xl backdrop-saturate-150">
          <Highlight
            controlledItems
            value={activeHref}
            transition={pillSpring}
            className="inset-0 rounded-2xl bg-midnight-green"
          >
            {PORTAL_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <HighlightItem
                  key={item.href}
                  value={item.href}
                  as="li"
                  className="flex-1"
                >
                  <Link
                    href={item.href}
                    aria-current={item.href === activeHref ? "page" : undefined}
                    className="group flex flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-[11px] font-medium text-muted-foreground transition-[color,transform] duration-200 active:scale-95 data-[active=true]:text-mikado-yellow"
                  >
                    <Icon className="h-5 w-5 [stroke-width:1.75] group-data-[active=true]:[stroke-width:2.25]" />
                    {item.label}
                  </Link>
                </HighlightItem>
              );
            })}
          </Highlight>
        </ul>
      </nav>
    </MotionConfig>
  );
}
