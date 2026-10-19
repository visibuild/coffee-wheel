import { describe, expect, it } from "vitest";
import { isAllowedEmail } from "@/auth.config";

describe("isAllowedEmail", () => {
  it("accepts verified visibuild.com emails, case-insensitively", () => {
    expect(isAllowedEmail("Dave@Visibuild.com", true)).toBe(true);
  });
  it("rejects lookalike domains", () => {
    expect(isAllowedEmail("x@visibuild.com.evil.com", true)).toBe(false);
  });
  it("rejects other domains", () => {
    expect(isAllowedEmail("x@gmail.com", true)).toBe(false);
  });
  it("rejects unverified emails", () => {
    expect(isAllowedEmail("x@visibuild.com", false)).toBe(false);
  });
  it("rejects missing emails", () => {
    expect(isAllowedEmail(null, true)).toBe(false);
    expect(isAllowedEmail(undefined, true)).toBe(false);
  });
});
