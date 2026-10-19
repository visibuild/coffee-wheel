import NextAuth from "next-auth";
import authConfig from "./auth.config";

// Edge-safe config only: no DB access here.
export const proxy = NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/((?!api/auth|api/cron|signin|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
