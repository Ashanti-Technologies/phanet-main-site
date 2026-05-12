"use client";

import Image from "next/image";
import Link from "next/link";
import { Sheet, SheetTrigger, SheetContent } from "../ui/sheet";
import { LiquidButton } from "../animate-ui/components/buttons/liquid";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { authClient } from "@/lib/auth-client";
import { hasAnyAdminRole, parseRoles } from "@/lib/rbac/roles";

const navItems = [
  { label: "New Here?", href: "/new-here" },
  { label: "About", href: "/about" },
  { label: "Messages", href: "/messages" },
  { label: "Events", href: "/events" },
  { label: "eGroups", href: "/egroups" },
  { label: "Chapters", href: "/chapters" },
  { label: "Give", href: "/give" },
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

export default function Header() {
  const { data: session, isPending } = authClient.useSession();
  const sessionUser = session?.user as
    | ({ role?: string } & NonNullable<typeof session>["user"])
    | undefined;
  const isLoggedIn = !!sessionUser && !isPending;
  const homeHref = sessionUser
    ? hasAnyAdminRole(parseRoles(sessionUser.role))
      ? "/admin"
      : "/me"
    : "/auth/login";
  const user = {
    name: sessionUser?.name ?? "",
    avatar: sessionUser?.image ?? undefined,
    initials: initialsFor(sessionUser?.name),
  };
  return (
    <header className="w-full flex items-center justify-between px-12 py-3 fixed top-0 left-0 z-50 transition-colors duration-300 border-b border-b-black/40 bg-black/70 backdrop-blur-md">
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
      <nav className="hidden md:flex items-center gap-6">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-white/80 hover:text-white transition-colors duration-200 text-base font-semibold"
          >
            {item.label}
          </Link>
        ))}

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
      </nav>

      {/* Mobile Navigation */}
      <Sheet>
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
          className="p-0 w-72 bg-black/95 border-r border-white/10"
        >
          <div className="flex flex-col h-full">
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
            <nav className="flex flex-col p-4 flex-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-200 py-3 px-4 rounded-lg text-base font-medium"
                >
                  {item.label}
                </Link>
              ))}
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
  );
}
