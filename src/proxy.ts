import NextAuth from "next-auth";
import authConfig from "./auth.config";

// Edge-safe config only: no DB access here.
export const proxy = NextAuth(authConfig).auth;

// Anchored exclusions; the static-asset extension rule never applies under api/.
// Must stay a literal here (Next statically analyses `config`); tested in proxy.test.ts.
export const config = {
  matcher: [
    "/((?!api/auth(?:/|$)|api/cron(?:/|$)|signin$|_next/static/|_next/image(?:/|$)|favicon\\.ico$|(?!api/).+\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
