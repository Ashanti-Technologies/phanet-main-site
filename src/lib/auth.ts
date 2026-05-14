import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { admin, magicLink, phoneNumber } from "better-auth/plugins";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./database";
import { nextCookies } from "better-auth/next-js";
import { getMessagingService } from "./messaging";
import { renderEmail } from "./email-templates/render";
import { MagicLinkSignInEmail } from "./email-templates/MagicLinkSignInEmail";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    phoneNumber({
      sendOTP: ({ phoneNumber, code }, ctx) => {
        // Implement sending OTP code via SMS
      },
    }),
    admin({}),
    magicLink({
      disableSignUp: true,
      expiresIn: 60 * 15,
      storeToken: "hashed",
      sendMagicLink: async ({ email, url }) => {
        const { html, text } = await renderEmail(
          MagicLinkSignInEmail({ url, expiresInMinutes: 15 }),
        );
        const service = getMessagingService("EMAIL");
        const result = await service.send({
          to: email,
          subject: "Your PHANET sign-in link",
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

export const getServerAuthSession = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session;
};
