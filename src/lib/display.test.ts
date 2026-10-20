import { describe, expect, it } from "vitest";
import { defaultColor, formatDate, formatPct, formatTime, headingFontSize, initials } from "./display";

describe("initials", () => {
  it("takes the first letters of the first and last names", () => {
    expect(initials("Priya Shah")).toBe("PS");
    expect(initials("Kai")).toBe("K");
    expect(initials("  mary   jane watson ")).toBe("MW");
  });
});

describe("formatPct", () => {
  it("formats a share as a one-decimal percentage", () => {
    expect(formatPct(0.045)).toBe("4.5%");
    expect(formatPct(0.25)).toBe("25.0%");
    expect(formatPct(1)).toBe("100.0%");
  });
});

describe("defaultColor", () => {
  it("is stable per id and cycles through a 12-colour palette", () => {
    expect(defaultColor(7)).toBe(defaultColor(7));
    expect(defaultColor(3)).toBe(defaultColor(15));
    expect(defaultColor(1)).not.toBe(defaultColor(2));
    const palette = new Set(Array.from({ length: 24 }, (_, i) => defaultColor(i)));
    expect(palette.size).toBe(12);
    for (const c of palette) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("formatDate", () => {
  it("formats in Melbourne time as 'Tue 20 Oct'", () => {
    expect(formatDate(new Date("2026-10-20T01:00:00Z"))).toBe("Tue 20 Oct");
    // 23:30 UTC on the 19th is already the 20th in Melbourne (AEDT, UTC+11).
    expect(formatDate(new Date("2026-10-19T23:30:00Z"))).toBe("Tue 20 Oct");
  });
});

describe("formatTime", () => {
  it("formats in Melbourne time as '9:41 am'", () => {
    // 22:41 UTC on the 19th is 9:41 am AEDT on the 20th.
    expect(formatTime(new Date("2026-10-19T22:41:00Z"))).toBe("9:41 am");
    expect(formatTime(new Date("2026-10-20T04:05:00Z"))).toBe("3:05 pm");
  });
});

describe("headingFontSize", () => {
  it("shrinks for long text", () => {
    expect(headingFontSize("Kai picks the café!")).toBe(54);
    expect(headingFontSize("Bartholomew Smythe picks the café!")).toBe(42);
    expect(headingFontSize("x".repeat(60))).toBe(32);
  });
});
