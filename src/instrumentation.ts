import type { Instrumentation } from "next";

// Catches errors nothing else handled: server components, route handlers,
// server actions. Client-side errors go to PostHog via instrumentation-client.ts.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { log } = await import("@/lib/logger");
  log.error("request", "unhandled", {
    err,
    method: request.method,
    path: request.path,
    routeType: context.routeType,
    routePath: context.routePath,
  });
};
