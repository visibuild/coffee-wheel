import { describe, expect, it } from "vitest";
import { buildTimeline } from "./timeline";

const at = (s: string) => new Date(`2026-10-20T${s}:00Z`);

describe("buildTimeline", () => {
  it("merges and sorts newest first", () => {
    const spins = [
      { id: 1, createdAt: at("01:00") },
      { id: 2, createdAt: at("03:00") },
    ] as never[];
    const changes = [
      { id: 1, createdAt: at("02:00") },
      { id: 2, createdAt: at("04:00") },
    ] as never[];
    const items = buildTimeline(spins, changes);
    expect(items.map((i) => `${i.kind}${i.kind === "spin" ? i.spin.id : i.change.id}`)).toEqual([
      "weight2",
      "spin2",
      "weight1",
      "spin1",
    ]);
    expect(items.map((i) => i.at)).toEqual([at("04:00"), at("03:00"), at("02:00"), at("01:00")]);
  });
});
