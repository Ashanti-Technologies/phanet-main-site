import Link from "next/link";

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold text-mikado-yellow">
                PHANET
              </span>
            </Link>
            <span className="hidden text-sm text-muted-foreground sm:block">
              Fundraising Projects
            </span>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t bg-background py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-lg font-semibold text-mikado-yellow">
            Phanerosis Prayer Network International
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Raising One Billion Intercessors Worldwide
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            © {new Date().getFullYear()} PHANET. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
