import { NextResponse, type NextRequest } from "next/server";
import { HOE, isHoeHost } from "@/lib/event-subdomain";

/**
 * Next.js 16 Proxy for subdomain-based routing
 * Routes requests from projects.phanerosisnetwork.com to /projects routes
 */
export function proxy(request: NextRequest): NextResponse | undefined {
  const hostname = request.headers.get("host") || "";
  const url = request.nextUrl.clone();

  // Define subdomain patterns
  const isProjectsSubdomain =
    hostname.startsWith("projects.") ||
    hostname.startsWith("projects.localhost");

  // hoe.phanerosisnetwork.com → the Heaven on Earth event. Only "/" and
  // "/register" are rewritten; everything else (/auth, /me, /events/…, /api)
  // passes through so sign-in and the portal keep working on this host.
  if (isHoeHost(hostname)) {
    const target =
      url.pathname === "/"
        ? `/events/${HOE.slug}`
        : url.pathname === "/register"
          ? `/events/${HOE.slug}/register`
          : null;
    if (!target) return undefined;
    url.pathname = target;
    return NextResponse.rewrite(url);
  }

  // Handle projects subdomain routing
  if (isProjectsSubdomain) {
    // Rewrite to /projects path internally
    const pathname = url.pathname;

    // Don't rewrite API routes, static files, or _next
    if (
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/static") ||
      pathname.includes(".")
    ) {
      return undefined;
    }

    // Rewrite root to /projects listing
    if (pathname === "/") {
      url.pathname = "/projects";
      return NextResponse.rewrite(url);
    }

    // Rewrite other paths to /projects/[path]
    if (!pathname.startsWith("/projects")) {
      url.pathname = `/projects${pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return undefined;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
