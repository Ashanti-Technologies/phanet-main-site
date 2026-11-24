import type { Instrumentation } from "next";

// Catches errors nothing else handled: server components, route handlers,
// server actions. Client-side errors go to PostHog via instrumentation-client.ts.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { log } = await import("@/lib/logger");
  const { distinctIdFromCookieHeader } = await import("@/lib/posthog-server");
  const cookie = request.headers.cookie;
  log.error("request", "unhandled", {
    err,
    distinctId: distinctIdFromCookieHeader(Array.isArray(cookie) ? cookie.join("; ") : cookie),
    method: request.method,
    path: request.path,
    routeType: context.routeType,
    routePath: context.routePath,
  });
};
