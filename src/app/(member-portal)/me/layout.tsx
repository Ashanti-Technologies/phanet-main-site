import Image from "next/image";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { APP_CONFIG } from "@/constants";
import { getCurrentMemberOrRedirect } from "@/lib/member-portal";
import { PortalDesktopNav, PortalMobileNav } from "./_components/portal-nav";
import { PortalUserMenu } from "./_components/portal-user-menu";
import { portalSans } from "./_components/portal-font";

export default async function MemberPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, member } = await getCurrentMemberOrRedirect();
  const displayName =
    member.preferredName || member.fullName || session.user.name || "Member";
  const email = member.email || session.user.email || "";

  return (
    <div
      className={`${portalSans.variable} min-h-svh bg-background font-sans text-foreground antialiased **:data-[slot=button]:active:scale-[0.97]`}
    >
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/me"
            className="flex items-center gap-3"
            aria-label="PHANET portal home"
          >
            <Image
              src="/images/logo.png"
              alt="PHANET"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
              priority
            />
            <span className="hidden sm:flex sm:flex-col sm:leading-tight">
              <span className="font-serif text-base font-semibold tracking-tight text-midnight-green">
                PHANET Portal
              </span>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Member space
              </span>
            </span>
          </Link>

          <PortalDesktopNav />

          <PortalUserMenu
            name={displayName}
            email={email}
            image={member.photoUrl}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-6 sm:px-6 md:pb-12">
        {children}

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-6 text-xs text-muted-foreground">
          <p className="flex items-center gap-2">
            <LifeBuoy className="h-3.5 w-3.5" />
            Need help? Reach us at{" "}
            <a
              href={`mailto:${APP_CONFIG.contactEmail}`}
              className="font-medium text-midnight-green underline-offset-2 hover:underline"
            >
              {APP_CONFIG.contactEmail}
            </a>
          </p>
          <p>© {new Date().getFullYear()} PHANET</p>
        </div>
      </main>

      <PortalMobileNav />
    </div>
  );
}
