import { NextResponse, type NextRequest } from "next/server";
import { HOE, isHoeHost } from "@/lib/event-subdomain";

/**
 * Next.js 16 Proxy for subdomain-based routing (hoe.* event site, old projects.* host).
 */
export function proxy(request: NextRequest): NextResponse | undefined {
  const hostname = request.headers.get("host") || "";
  const url = request.nextUrl.clone();

  const isProjectsSubdomain = hostname.startsWith("projects.");

  // hoe.phanerosisnetwork.com → the Heaven on Earth event. Only "/",
  // "/register" and "/flyer" are rewritten; everything else (/auth, /me,
  // /events/…, /api) passes through so sign-in and the portal keep working.
  if (isHoeHost(hostname)) {
    const target =
      url.pathname === "/"
        ? `/events/${HOE.slug}`
        : url.pathname === "/register" || url.pathname === "/flyer"
          ? `/events/${HOE.slug}${url.pathname}`
          : null;
    if (!target) return undefined;
    url.pathname = target;
    return NextResponse.rewrite(url);
  }

  // The old projects.* subdomain: projects now live on the main site, so send
  // shared links there (projects.x/abc → x/projects/abc).
  if (isProjectsSubdomain) {
    const { pathname, search, protocol } = url;
    const path = pathname.startsWith("/projects")
      ? pathname
      : `/projects${pathname === "/" ? "" : pathname}`;
    const host = hostname.replace(/^projects\./, "");
    return NextResponse.redirect(`${protocol}//${host}${path}${search}`, 308);
  }

  return undefined;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - ingest (PostHog proxy)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|ingest|_next/static|_next/image|favicon.ico).*)",
  ],
};
