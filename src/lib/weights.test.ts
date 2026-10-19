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
  test("applySpin halves winner relative to others", () => {
    const r = applySpin(eq(4), 1); // weights 0.5,1,1,1 → /3.5
    expect(shareOf(r, 1)).toBeCloseTo(0.5 / 3.5, 10);
    expect(shareOf(r, 2)).toBeCloseTo(1 / 3.5, 10);
  });
  test("everyone picked once returns to equal", () => {
    let r = eq(3);
    for (const id of [1, 2, 3]) r = applySpin(r, id);
    r.forEach((e) => expect(e.weight).toBeCloseTo(1 / 3, 10));
  });
  test("undo reverses spin exactly", () => {
    const r = applyUndo(applySpin(eq(5), 2), 2);
    r.forEach((e) => expect(e.weight).toBeCloseTo(0.2, 10));
  });
  test("undo of older spin keeps later spins", () => {
    const r = applyUndo(applySpin(applySpin(eq(3), 1), 2), 1);
    expect(r).toEqual(
      expect.arrayContaining(
        applySpin(eq(3), 2).map((e) => ({ id: e.id, weight: expect.closeTo(e.weight, 10) })),
      ),
    );
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
    expect(shareOf(r, 2) / shareOf(r, 1)).toBeCloseTo(2, 10);
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
