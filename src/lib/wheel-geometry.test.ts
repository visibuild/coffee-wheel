import { describe, expect, it } from "vitest";
import { sliceAngles, targetRotation } from "./wheel-geometry";

describe("sliceAngles", () => {
  it("lays slices clockwise from 12 o'clock", () => {
    expect(sliceAngles([0.25, 0.75])).toEqual([
      { start: 0, end: 90, mid: 45 },
      { start: 90, end: 360, mid: 225 },
    ]);
  });

  it("always ends the last slice at exactly 360", () => {
    const angles = sliceAngles([0.1, 0.2, 0.3, 0.4]);
    expect(angles.at(-1)!.end).toBe(360);
    expect(sliceAngles([1])).toEqual([{ start: 0, end: 360, mid: 180 }]);
  });
});

describe("targetRotation", () => {
  it("finds the smallest rotation after the full turns that puts the slice centre under the pointer", () => {
    expect(targetRotation(0, 45)).toBe(2115);
    expect(targetRotation(2115, 225)).toBe(4095);
  });

  it("applies jitter and custom turn counts", () => {
    const r = targetRotation(100, 45, 3, 10);
    expect(r).toBeGreaterThanOrEqual(100 + 3 * 360);
    expect(r).toBeLessThan(100 + 4 * 360);
    expect((r + 45 + 10) % 360).toBeCloseTo(0);
  });
});
