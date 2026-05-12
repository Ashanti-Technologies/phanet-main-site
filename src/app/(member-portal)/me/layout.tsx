import Link from "next/link";
import { getCurrentMemberOrRedirect } from "@/lib/member-portal";

const nav = [
  { href: "/me", label: "Overview" },
  { href: "/me/profile", label: "Profile" },
  { href: "/me/giving", label: "Giving" },
  { href: "/me/events", label: "Events" },
  { href: "/me/notifications", label: "Notifications" },
];

export default async function MemberPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { member } = await getCurrentMemberOrRedirect();

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <Link href="/me" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-mikado-yellow font-bold text-black">
              PN
            </span>
            <span>
              <span className="block text-sm font-semibold">PHANET Portal</span>
              <span className="block text-xs text-muted-foreground">
                {member.preferredName || member.fullName}
              </span>
            </span>
          </Link>
          <nav className="flex flex-wrap gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
