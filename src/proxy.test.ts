import { describe, expect, it, vi } from "vitest";
vi.mock("next-auth", () => ({ default: () => ({ auth: () => {} }) }));
const { config } = await import("@/proxy");

const re = new RegExp(`^${config.matcher[0]}$`);
const protectedBy = (p: string) => re.test(p);

describe("proxy matcher", () => {
  it.each(["/", "/admin", "/api/people", "/api/authz", "/signinx", "/signin/x", "/api/x.png", "/api/cronx", "/api/cron-admin", "/signing-up", "/api/spins/1/card.png"])(
    "protects %s",
    (p) => expect(protectedBy(p)).toBe(true),
  );
  it.each(["/api/auth/session", "/api/auth/callback/google", "/api/cron/slack-emoji", "/signin", "/_next/static/a.js", "/favicon.ico", "/logo.svg"])(
    "does not protect %s",
    (p) => expect(protectedBy(p)).toBe(false),
  );
});
