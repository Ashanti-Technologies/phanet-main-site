import { PostHog } from "posthog-node";
import { after } from "next/server";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;

let posthogClient: PostHog | null = null;

export function getPostHogClient() {
  if (!posthogClient) {
    posthogClient = new PostHog(token ?? "unset", {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
      // Calls become no-ops in development or when the token is missing.
      disabled: process.env.NODE_ENV === "development" || !token,
    });
  }
  return posthogClient;
}

export async function shutdownPostHog() {
  if (posthogClient) {
    await posthogClient.shutdown();
  }
}

/** Keep the function alive until `p` settles (request scope), else fire and forget. */
export function keepAlive(p: Promise<unknown>) {
  const safe = p.catch(() => {});
  try {
    after(safe);
  } catch {
    // outside a request (scripts, module init)
  }
}

/**
 * Server-side business event. Pass the user's id when known so it joins the
 * browser person (the client identifies with the same id); otherwise the event
 * is personless.
 */
export function track(event: string, distinctId: string | null | undefined, properties: Record<string, unknown> = {}) {
  keepAlive(
    getPostHogClient().captureImmediate({
      distinctId: distinctId ?? `anon_${crypto.randomUUID()}`,
      event,
      properties: distinctId ? properties : { ...properties, $process_person_profile: false },
    }),
  );
}

/** The browser's PostHog distinct_id, read from its `ph_<token>_posthog` cookie. */
export function distinctIdFromCookieHeader(cookieHeader: string | null | undefined): string | undefined {
  if (!cookieHeader || !token) return undefined;
  const raw = cookieHeader.match(new RegExp(`(?:^|;\\s*)ph_${token}_posthog=([^;]+)`))?.[1];
  if (!raw) return undefined;
  try {
    return JSON.parse(decodeURIComponent(raw)).distinct_id || undefined;
  } catch {
    return undefined;
  }
}
