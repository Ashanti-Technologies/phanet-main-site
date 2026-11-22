/**
 * hoe.phanerosisnetwork.com serves one event's pages:
 *   /          → /events/<slug>
 *   /register  → /events/<slug>/register
 * Next year: change `slug` here (and nothing else).
 */
export const HOE = {
  hostPrefix: "hoe.",
  slug: "hoe-2026",
  origin: "https://hoe.phanerosisnetwork.com",
} as const;

export const isHoeHost = (host: string | null | undefined) =>
  !!host?.startsWith(HOE.hostPrefix);

/**
 * Where a visitor on `host` registers for `slug`. On the subdomain the URL is
 * absolute, because sign-in links finish on the main domain and must send
 * people back here. (Better Auth rejects callback hosts not in
 * trustedOrigins, so a spoofed Host header can't redirect anywhere else.)
 */
export function registerLocation(slug: string, host: string | null | undefined) {
  if (isHoeHost(host) && slug === HOE.slug) {
    const proto = host!.includes("localhost") ? "http" : "https";
    return { path: "/register", url: `${proto}://${host}/register` };
  }
  const path = `/events/${slug}/register`;
  return { path, url: path };
}

/**
 * Absolute register link for emails, share messages and payment callbacks
 * (no request host available). Always the main domain: hoe. has no DNS record
 * yet. Once it does, return `${HOE.origin}/register` for HOE.slug again.
 */
export function registerEmailUrl(slug: string) {
  return `${process.env.BETTER_AUTH_URL ?? ""}/events/${slug}/register`;
}
