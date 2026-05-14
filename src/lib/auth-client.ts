import { createAuthClient } from "better-auth/react";
import {
  magicLinkClient,
  twoFactorClient,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  /** The base URL of the server (optional if you're using the same domain) */
  // baseURL: "http://localhost:3000"
  plugins: [
    magicLinkClient(),
    twoFactorClient({
      onTwoFactorRedirect: () => {
        // Send the user to the 2FA challenge page after sign-in.
        window.location.href = "/auth/two-factor";
      },
    }),
  ],
});

export const getClientAuthSession = async () => {
  const session = await authClient.getSession();

  return session;
};
