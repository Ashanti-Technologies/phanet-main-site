import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd()
  },
  // Dev-only: let phones/laptops on any private LAN (home Wi-Fi, hotspot) use
  // HMR without pinning an IP that changes. Ignored in production.
  allowedDevOrigins: [
    "10.*.*.*",
    "192.168.*.*",
    ...Array.from({ length: 16 }, (_, i) => `172.${16 + i}.*.*`),
  ],
  // Allow images from Cloudinary and Google
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/worship",
        destination: "/new-here",
        permanent: true,
      },
      // /join merged into the newcomer page.
      {
        source: "/join",
        destination: "/new-here",
        permanent: true,
      },
      // HOE 2026's slug was renamed; keep already-shared links (WhatsApp etc.) working.
      {
        source: "/events/heaven-on-earth-2026/:path*",
        destination: "/events/hoe-2026/:path*",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  // Required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
