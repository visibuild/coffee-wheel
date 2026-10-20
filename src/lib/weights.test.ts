import { describe, expect, test } from "vitest";
import {
  addEntry,
  applySpin,
  applyUndo,
  pickWinner,
  removeEntry,
  setShare,
  shareOf,
} from "./weights";

const eq = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1, weight: 1 / n }));
const sum = (r: { weight: number }[]) => r.reduce((s, e) => s + e.weight, 0);

describe("weights", () => {
  test("applySpin halves the winner's share", () => {
    const r = applySpin(
      [
        { id: 1, weight: 0.8 },
        { id: 2, weight: 0.2 },
      ],
      1,
    );
    expect(shareOf(r, 1)).toBeCloseTo(0.4, 10);
    expect(shareOf(r, 2)).toBeCloseTo(0.6, 10);
    const q = applySpin(eq(4), 1);
    expect(shareOf(q, 1)).toBeCloseTo(0.125, 10);
    expect(shareOf(q, 2)).toBeCloseTo(0.875 / 3, 10);
    expect(sum(q)).toBeCloseTo(1, 10);
  });
  test.each([3, 25])("everyone picked once keeps %i people within a factor of 2", (n) => {
    let r = eq(n);
    for (let id = 1; id <= n; id++) r = applySpin(r, id);
    const ws = r.map((e) => e.weight);
    expect(Math.max(...ws) / Math.min(...ws)).toBeLessThan(2);
    expect(sum(r)).toBeCloseTo(1, 10);
  });
  test("undo reverses spin exactly", () => {
    const cases = [eq(5), [0.5, 0.3, 0.2].map((weight, i) => ({ id: i + 1, weight }))];
    for (const x of cases) {
      for (const { id } of x) {
        const r = applyUndo(applySpin(x, id), id);
        r.forEach((e, i) => expect(e.weight).toBeCloseTo(x[i].weight, 10));
      }
    }
  });
  test("undo of an older spin is approximate but valid", () => {
    const after = applySpin(applySpin(eq(3), 1), 2);
    const r = applyUndo(after, 1);
    r.forEach((e) => {
      expect(Number.isFinite(e.weight)).toBe(true);
      expect(e.weight).toBeGreaterThan(0);
    });
    expect(sum(r)).toBeCloseTo(1, 10);
    expect(shareOf(r, 1)).toBeGreaterThan(shareOf(after, 1));
  });
  test("undo falls back when doubling would exceed 1", () => {
    const x = [
      { id: 1, weight: 0.6 },
      { id: 2, weight: 0.4 },
    ];
    const r = applyUndo(x, 1);
    expect(sum(r)).toBeCloseTo(1, 10);
    r.forEach((e) => expect(e.weight).toBeGreaterThan(0));
    expect(shareOf(r, 1)).toBeGreaterThan(0.6);
  });
  test("undo with absent winner is a no-op", () => {
    const r = applyUndo(eq(3), 99);
    expect(r).toHaveLength(3);
    r.forEach((e, i) => {
      expect(e.id).toBe(i + 1);
      expect(e.weight).toBeCloseTo(1 / 3, 10);
    });
  });
  test("addEntry gives exactly 1/n after many spins", () => {
    let r = eq(24);
    for (let i = 0; i < 100; i++) r = applySpin(r, (i % 24) + 1);
    r = addEntry(r, 25);
    expect(shareOf(r, 25)).toBeCloseTo(1 / 25, 10);
    expect(sum(r)).toBeCloseTo(1, 10);
  });
  test("removeEntry renormalises", () => {
    const r = removeEntry(eq(4), 1);
    expect(r.map((e) => e.id)).toEqual([2, 3, 4]);
    r.forEach((e) => expect(e.weight).toBeCloseTo(1 / 3, 10));
  });
  test("setShare sets target and scales others proportionally", () => {
    const r = setShare(applySpin(eq(3), 1), 3, 0.5);
    expect(shareOf(r, 3)).toBeCloseTo(0.5, 10);
    expect(shareOf(r, 2) / shareOf(r, 1)).toBeCloseTo(2.5, 10);
    expect(sum(r)).toBeCloseTo(1, 10);
  });
  test("setShare rejects 0 and 1 when n>1", () => {
    expect(() => setShare(eq(2), 1, 0)).toThrow(RangeError);
    expect(() => setShare(eq(2), 1, 1)).toThrow(RangeError);
  });
  test("single person", () => {
    expect(applySpin(eq(1), 1)[0].weight).toBeCloseTo(1, 10);
    expect(setShare(eq(1), 1, 0.3)[0].weight).toBe(1);
    expect(pickWinner(eq(1), 0.999)).toBe(1);
  });
  test("pickWinner uses cumulative order", () => {
    const r = [{ id: 7, weight: 0.25 }, { id: 8, weight: 0.75 }];
    expect(pickWinner(r, 0)).toBe(7);
    expect(pickWinner(r, 0.2499)).toBe(7);
    expect(pickWinner(r, 0.25)).toBe(8);
    expect(() => pickWinner([], 0.5)).toThrow(RangeError);
  });
  test("pickWinner falls back to last entry when rand exceeds the total", () => {
    const r = [{ id: 1, weight: 0.3 }, { id: 2, weight: 0.3 }];
    expect(pickWinner(r, 0.99)).toBe(2);
  });
  test("functions do not mutate their input", () => {
    const r = eq(3);
    const snapshot = JSON.parse(JSON.stringify(r));
    applySpin(r, 1);
    applyUndo(r, 1);
    addEntry(r, 4);
    removeEntry(r, 1);
    setShare(r, 1, 0.5);
    expect(r).toEqual(snapshot);
  });
  test("1000 spins keep weights finite and summing to 1", () => {
    let r = eq(10);
    for (let i = 0; i < 1000; i++) r = applySpin(r, pickWinner(r, Math.random()));
    r.forEach((e) => {
      expect(Number.isFinite(e.weight)).toBe(true);
      expect(e.weight).toBeGreaterThan(0);
    });
    expect(sum(r)).toBeCloseTo(1, 10);
  });
});
