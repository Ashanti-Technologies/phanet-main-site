"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "../ui/navigation-menu";
import { Sheet, SheetTrigger, SheetContent } from "../ui/sheet";
import { LiquidButton } from "../animate-ui/components/buttons/liquid";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { authClient } from "@/lib/auth-client";

// Dark-header look for the shadcn navigation-menu pills (top-level links and triggers).
const topItemClass =
  "bg-transparent px-3 text-base font-semibold text-white/80 hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white data-popup-open:bg-white/10 data-popup-open:text-white data-popup-open:hover:bg-white/10 data-open:bg-white/10 data-open:hover:bg-white/10 data-open:focus:bg-white/10";

type NavLink = { label: string; href: string };
type NavItem = NavLink | { label: string; items: NavLink[] };

const navItems: NavItem[] = [
  { label: "New Here?", href: "/new-here" },
  {
    label: "About",
    items: [
      { label: "About PHANET", href: "/about" },
      { label: "eGroups", href: "/egroups" },
    ],
  },
  {
    label: "Media",
    items: [
      { label: "Messages", href: "/messages" },
      { label: "Library", href: "/library" },
      { label: "Gallery", href: "/gallery" },
    ],
  },
  { label: "Events", href: "/events" },
  {
    label: "Give",
    items: [
      { label: "Give online", href: "/give" },
      { label: "Projects", href: "/projects" },
    ],
  },
];

function initialsFor(name: string | null | undefined) {
  if (!name) return "?";
  return (
    name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export default function Header({ banner }: { banner?: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();
  const sessionUser = session?.user as
    | ({ role?: string } & NonNullable<typeof session>["user"])
    | undefined;
  const isLoggedIn = !!sessionUser && !isPending;
  const homeHref = sessionUser ? "/me" : "/auth/login";
  const user = {
    name: sessionUser?.name ?? "",
    avatar: sessionUser?.image ?? undefined,
    initials: initialsFor(sessionUser?.name),
  };
  return (
    <div className="fixed top-0 left-0 z-50 w-full">
      {banner}
    <header className="w-full flex items-center justify-between px-6 sm:px-8 lg:px-12 py-3 transition-colors duration-300 border-b border-b-black/40 bg-black/70 backdrop-blur-md">
      <div className="flex items-center">
        <Link href="/">
          <Image
            src="/images/logo.svg"
            alt="Logo"
            width={40}
            height={40}
            priority
            className="transition-all duration-200 ease-in-out"
          />
        </Link>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-4">
        <NavigationMenu>
          <NavigationMenuList>
            {navItems.map((item) => (
              <NavigationMenuItem key={item.label}>
                {"href" in item ? (
                  <NavigationMenuLink
                    render={<Link href={item.href} />}
                    className={navigationMenuTriggerStyle({ className: topItemClass })}
                  >
                    {item.label}
                  </NavigationMenuLink>
                ) : (
                  <>
                    <NavigationMenuTrigger className={topItemClass}>{item.label}</NavigationMenuTrigger>
                    <NavigationMenuContent className="min-w-44 rounded-lg bg-gray-950 p-1.5 text-white">
                      {item.items.map((link) => (
                        <NavigationMenuLink
                          key={link.href}
                          render={<Link href={link.href} />}
                          className="px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
                        >
                          {link.label}
                        </NavigationMenuLink>
                      ))}
                    </NavigationMenuContent>
                  </>
                )}
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Login Button or Avatar */}
        {isLoggedIn ? (
          <Link href={homeHref} aria-label="Open dashboard">
            <Avatar className="cursor-pointer hover:ring-2 hover:ring-white/50 transition-all">
              {user.avatar ? (
                <AvatarImage src={user.avatar} alt={user.name} />
              ) : null}
              <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                {user.initials}
              </AvatarFallback>
            </Avatar>
          </Link>
        ) : (
          <Link href="/auth/login">
            <LiquidButton variant="default" size="default">
              Login
            </LiquidButton>
          </Link>
        )}
      </div>

      {/* Mobile Navigation */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger asChild>
          <button
            aria-label="Open menu"
            className="md:hidden p-2 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {/* Hamburger icon */}
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="p-0 w-72 bg-black/95 border-r border-white/10 text-white"
        >
          {/* Any link tap closes the drawer -- incl. same-page links like the logo on "/". */}
          <div
            className="flex flex-col h-full"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) setMenuOpen(false);
            }}
          >
            {/* Sheet Header with Logo */}
            <div className="p-6 border-b border-white/10">
              <Link href="/">
                <Image
                  src="/images/logo.svg"
                  alt="Logo"
                  width={40}
                  height={40}
                  className="transition-all duration-200 ease-in-out"
                />
              </Link>
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-col p-4 flex-1 overflow-y-auto">
              {navItems.map((item) =>
                "href" in item ? (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-200 py-3 px-4 rounded-lg text-base font-medium"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <div key={item.label} className="mt-3 flex flex-col">
                    <span className="px-4 pb-1 text-xs font-semibold uppercase tracking-widest text-white/40">
                      {item.label}
                    </span>
                    {item.items.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-200 py-3 px-4 rounded-lg text-base font-medium"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                ),
              )}
            </nav>

            {/* Mobile Login/Profile Section */}
            <div className="p-4 border-t border-white/10">
              {isLoggedIn ? (
                <Link
                  href={homeHref}
                  className="flex items-center gap-3 text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-200 py-3 px-4 rounded-lg"
                >
                  <Avatar className="size-10">
                    {user.avatar ? (
                      <AvatarImage src={user.avatar} alt={user.name} />
                    ) : null}
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                      {user.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.name}</span>
                </Link>
              ) : (
                <Link href="/auth/login" className="block">
                  <LiquidButton variant="ghost" size="lg" className="w-full">
                    Login
                  </LiquidButton>
                </Link>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
    </div>
  );
}
