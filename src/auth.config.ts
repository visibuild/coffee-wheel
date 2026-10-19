import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

const DOMAIN = "visibuild.com";

/** Edge-safe (no DB imports): shared by the proxy and the full auth setup. */
export function isAllowedEmail(
  email: string | null | undefined,
  emailVerified: boolean,
): boolean {
  if (!email || !emailVerified) return false;
  return email.trim().toLowerCase().endsWith(`@${DOMAIN}`);
}

export const devLoginEnabled =
  process.env.AUTH_DEV_LOGIN === "1" && process.env.NODE_ENV !== "production";

export default {
  providers: [
    Google({ authorization: { params: { hd: DOMAIN } } }),
    ...(devLoginEnabled
      ? [
          Credentials({
            id: "dev",
            name: "Dev login",
            credentials: { email: {} },
            authorize(credentials) {
              const email = String(credentials?.email ?? "").trim().toLowerCase();
              return isAllowedEmail(email, true) ? { id: email, email } : null;
            },
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    signIn({ account, profile }) {
      if (account?.provider === "google") {
        return isAllowedEmail(profile?.email, profile?.email_verified === true);
      }
      return true; // dev provider already validated in authorize()
    },
    // Used by the proxy: signed-out users go to /signin (or 401 for API calls).
    authorized({ auth, request }) {
      if (auth?.user) return true;
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      return false;
    },
  },
} satisfies NextAuthConfig;
