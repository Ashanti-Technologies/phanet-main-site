"use client";

import posthog from "posthog-js";

/** A plain link that reports the click to PostHog (downloads, store visits). */
export function TrackedLink({
  event,
  properties,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { event: string; properties: Record<string, unknown> }) {
  return <a {...props} onClick={() => posthog.capture(event, properties)} />;
}
