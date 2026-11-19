import { log } from "./logger";
import { headers } from "next/headers";
import { cache } from "react";
import { betterAuth } from "better-auth";
import {
  admin,
  lastLoginMethod,
  magicLink,
  phoneNumber,
  twoFactor,
} from "better-auth/plugins";
import { userAc } from "better-auth/plugins/admin/access";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./database";
import { nextCookies } from "better-auth/next-js";
import { getMessagingService } from "./messaging";
import { renderEmail } from "./email-templates/render";
import { MagicLinkSignInEmail } from "./email-templates/MagicLinkSignInEmail";
import { loadGrants, userHasAdminAccess } from "./rbac/access";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  // Accept callbacks from every host the site is reachable on. The apex domain
  // is canonical, but `www.` and the `projects.` subdomain (proxied to the
  // fundraising routes) both live on the same Next app and need to be trusted.
  trustedOrigins: [
    "https://phanerosisnetwork.com",
    "https://www.phanerosisnetwork.com",
    "https://projects.phanerosisnetwork.com",
    "https://hoe.phanerosisnetwork.com",
    "http://localhost:3000",
    "http://projects.localhost:3000",
    "http://hoe.localhost:3000",
  ],
  advanced: {
    // New prefix so pre-existing host-only cookies are ignored (everyone signs
    // in once more). Otherwise a stale apex-only cookie could survive sign-out.
    cookiePrefix: "phanet",
    // Share the session across apex, www, projects. and hoe. in production.
    // Off locally: browsers won't set a phanerosisnetwork.com cookie on localhost.
    ...(process.env.BETTER_AUTH_URL?.includes("phanerosisnetwork.com") && {
      crossSubDomainCookies: { enabled: true, domain: "phanerosisnetwork.com" },
    }),
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
  },
  // Brute-force protection: 30 requests / 60s per IP per path. Sign-in /
  // sign-up paths get tighter limits (Better Auth's defaults for those).
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
  },
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          // Audit admin sign-ins. Failures are swallowed inside logAudit.
          try {
            const user = await prisma.user.findUnique({
              where: { id: session.userId },
              select: { id: true, email: true, emailVerified: true, role: true },
            });
            if (!user) return;
            // Claim the matching registry record at sign-up/sign-in.
            // Dynamic import: member-claim → member-portal → auth-guard → here.
            await import("./member-claim")
              .then((m) => m.linkMemberByVerifiedEmail(user))
              .catch((err) => log.error("auth", "member auto-link failed", { userId: user.id, err }));
            const grants = await loadGrants(user.id);
            if (grants.length === 0) return;
            await prisma.auditLog.create({
              data: {
                actorId: user.id,
                action: "admin.sign_in",
                subject: "Session",
                subjectId: session.id,
                meta: {
                  email: user.email,
                  ipAddress: session.ipAddress ?? null,
                  userAgent: session.userAgent ?? null,
                  grants,
                },
              },
            });
          } catch (err) {
            log.error("auth", "admin sign-in audit failed", { err });
          }
        },
      },
    },
  },
  plugins: [
    phoneNumber({
      sendOTP: ({ phoneNumber, code }, ctx) => {
        // Implement sending OTP code via SMS
      },
    }),
    // Authorization lives in AdminRoleAssignment, not User.role. Defining only
    // the "user" role means the plugin's admin endpoints (setRole,
    // impersonate, ban, …) authorize nobody — even a leftover role = "admin" —
    // so they can't become a side door around src/lib/rbac.
    admin({ roles: { user: userAc } }),
    twoFactor({
      issuer: "PHANET",
    }),
    // Track which method (credential / google / magic-link) was used for the
    // most recent sign-in. We use this to decide whether to enforce 2FA.
    lastLoginMethod({
      storeInDatabase: true,
    }),
    magicLink({
      disableSignUp: true,
      expiresIn: 60 * 15,
      storeToken: "hashed",
      sendMagicLink: async ({ email, url }) => {
        // Admin-login links (callbackURL under /admin) only go to admins.
        // Return silently otherwise so the response doesn't reveal which
        // emails are admin accounts.
        const callback = new URL(
          new URL(url).searchParams.get("callbackURL") ?? "/",
          url,
        ).pathname;
        const isAdminLogin =
          callback === "/admin" || callback.startsWith("/admin/");
        if (isAdminLogin) {
          const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
            select: { id: true },
          });
          if (!user || !(await userHasAdminAccess(user.id))) return;
        }

        const portal = isAdminLogin ? "Admin Portal" : "Member Portal";
        const { html, text } = await renderEmail(
          MagicLinkSignInEmail({ url, expiresInMinutes: 15, portal }),
        );
        const service = getMessagingService("EMAIL");
        const result = await service.send({
          to: email,
          subject: `Your PHANET ${portal} sign-in link`,
          body: html,
          text,
        });
        if (!result.ok) {
          throw new Error(result.error ?? "Failed to send magic link");
        }
      },
    }),
    nextCookies(),
  ],
  socialProviders: {
    google: {
      prompt: "select_account",
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
});

// cache(): dedupe across layout + page + guards within one request.
export const getServerAuthSession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session;
});
