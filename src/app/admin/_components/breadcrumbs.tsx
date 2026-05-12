"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  admin: "Admin",
  content: "Content",
  events: "Events",
  pages: "Pages",
  homepage: "Homepage",
  sermons: "Sermons",
  projects: "Projects",
  "prayer-requests": "Prayer Requests",
  users: "Users",
  settings: "Settings",
  "church-units": "Church Units",
  new: "New",
  commitments: "Commitments",
  login: "Sign in",
};

// Cuid-ish dynamic id detector (avoid showing raw IDs in breadcrumbs)
function isLikelyId(segment: string): boolean {
  return (
    segment.length >= 16 &&
    /^[a-z0-9_-]+$/i.test(segment) &&
    /\d/.test(segment)
  );
}

function labelFor(segment: string): string {
  if (LABELS[segment]) return LABELS[segment];
  if (isLikelyId(segment)) return "Detail";
  return segment
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0 || segments[0] !== "admin") return null;

  // Always render "Admin" first as a link, then each subsequent segment.
  const crumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    return { label: labelFor(seg), href, isLast: i === segments.length - 1 };
  });

  // Replace bare /admin label "Admin" with "Dashboard" when it's the only crumb
  if (crumbs.length === 1) crumbs[0].label = "Dashboard";

  return (
    <motion.nav
      key={pathname}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      aria-label="Breadcrumb"
      className="hidden md:flex items-center text-sm"
    >
      <ol className="flex items-center gap-1.5">
        {crumbs.map((crumb, i) => (
          <li key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && (
              <ChevronRight
                className="h-3.5 w-3.5 text-muted-foreground/50"
                aria-hidden
              />
            )}
            {crumb.isLast ? (
              <span
                aria-current="page"
                className="font-medium text-foreground truncate max-w-[200px]"
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className={cn(
                  "text-muted-foreground hover:text-foreground transition-colors truncate max-w-[160px]",
                )}
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </motion.nav>
  );
}
