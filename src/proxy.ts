import { NextResponse, type NextRequest } from "next/server";

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
