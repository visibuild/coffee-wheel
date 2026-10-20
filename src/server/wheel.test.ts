import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { people, spins, weightChanges } from "@/db/schema";
import { applySpin } from "@/lib/weights";
import { makeTestDb } from "../../tests/helpers/db";
import { getWheelState, listHistory, spin, undoAndRespin, undoSpin } from "./wheel";

const T = 1 / 3;
let db: Db;

async function seed(n = 3) {
  for (let i = 1; i <= n; i++) {
    await db
      .insert(people)
      .values({
        name: `P${i}`,
        email: `person${i}@visibuild.com`,
        weight: 1 / n,
      });
  }
}
async function weights() {
  const rows = await db.select().from(people).orderBy(people.id);
  return rows.map((r) => ({ id: r.id, weight: r.weight }));
}
const eq3 = [1, 2, 3].map((id) => ({ id, weight: T }));
function expectWeights(
  actual: { id: number; weight: number }[],
  expected: { id: number; weight: number }[],
) {
  expect(actual.map((a) => a.id)).toEqual(expected.map((e) => e.id));
  actual.forEach((a, i) => expect(a.weight).toBeCloseTo(expected[i].weight, 9));
}
const ME = "person1@visibuild.com";

beforeEach(async () => {
  db = await makeTestDb();
  await seed();
});

describe("getWheelState", () => {
  it("returns active people ordered by id", async () => {
    await db.update(people).set({ active: false }).where(eq(people.id, 2));
    const { people: ps } = await getWheelState(db);
    expect(ps.map((p) => p.id)).toEqual([1, 3]);
  });
});

describe("spin", () => {
  it("halves winner and records chance", async () => {
    const r = await spin(db, ME, () => 0);
    expect(r.winnerId).toBe(1);
    expect(r.chance).toBeCloseTo(T, 9);
    expect(r.people.find((p) => p.id === 1)!.share).toBeCloseTo(T, 9);
    const w = await weights();
    expect(w[0].weight).toBeCloseTo(1 / 6, 9);
    expect(w[1].weight).toBeCloseTo(5 / 12, 9);
    expect(w[2].weight).toBeCloseTo(5 / 12, 9);
    const [row] = await db.select().from(spins);
    expect(row.spunBy).toBe(ME);
    expect(row.chance).toBeCloseTo(T, 9);
  });

  it("non-wheel user cannot spin", async () => {
    await expect(spin(db, "someone@visibuild.com")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(
      undoAndRespin(db, 1, "someone@visibuild.com"),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("actor email is matched case-insensitively", async () => {
    await expect(spin(db, "PERSON1@VISIBUILD.COM")).resolves.toBeTruthy();
  });

  it("spin with empty wheel errors", async () => {
    await db.delete(people);
    await expect(spin(db, ME)).rejects.toMatchObject({ code: "INVALID" });
  });

  it("concurrent spins both apply", async () => {
    await Promise.all([spin(db, ME, () => 0), spin(db, ME, () => 0.99)]);
    const rows = await db.select().from(spins).orderBy(spins.id);
    expect(rows).toHaveLength(2);
    // Share-halving spins don't commute, so replay them in recorded (spin id) order.
    const expected = rows.reduce((w, r) => applySpin(w, r.winnerId), eq3);
    const actual = await weights();
    expectWeights(actual, expected);
    expect(actual.reduce((t, w) => t + w.weight, 0)).toBeCloseTo(1, 9);
  });
});

describe("undoSpin", () => {
  it("restores weights", async () => {
    const r = await spin(db, ME, () => 0);
    const { spin: s } = await undoSpin(db, r.spinId, ME);
    expectWeights(await weights(), eq3);
    expect(s.undoneAt).toBeTruthy();
    expect(s.undoneBy).toBe(ME);
  });

  it("is allowed for a non-wheel user", async () => {
    const r = await spin(db, ME, () => 0);
    const { spin: s } = await undoSpin(db, r.spinId, "Someone@visibuild.com");
    expect(s.undoneBy).toBe("someone@visibuild.com");
  });

  it("second undo is rejected", async () => {
    const r = await spin(db, ME, () => 0);
    await undoSpin(db, r.spinId, ME);
    await spin(db, ME, () => 0.99); // winner 3 halved
    await expect(undoSpin(db, r.spinId, ME)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expectWeights(await weights(), applySpin(eq3, 3));
  });

  it("unknown spin is NOT_FOUND", async () => {
    await expect(undoSpin(db, 999, ME)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("leaves weights alone when the winner was removed", async () => {
    const r = await spin(db, ME, () => 0);
    await db
      .update(people)
      .set({ active: false, weight: 0 })
      .where(eq(people.id, 1));
    await db.update(people).set({ weight: 0.5 }).where(eq(people.id, 2));
    await db.update(people).set({ weight: 0.5 }).where(eq(people.id, 3));
    await undoSpin(db, r.spinId, ME);
    const w = await weights();
    expect(w[1].weight).toBe(0.5);
    expect(w[2].weight).toBe(0.5);
  });
});

describe("undoAndRespin", () => {
  it("undoes and records a new spin atomically", async () => {
    const first = await spin(db, ME, () => 0);
    const { undone, result } = await undoAndRespin(
      db,
      first.spinId,
      ME,
      () => 0.99,
    );
    expect(undone.id).toBe(first.spinId);
    expect(undone.undoneAt).toBeTruthy();
    expect(result.spinId).not.toBe(first.spinId);
    expect(result.winnerId).toBe(3);
    expectWeights(await weights(), applySpin(eq3, 3));
    expect(await db.select().from(spins)).toHaveLength(2);
  });

  it("rolls back the undo if the respin fails", async () => {
    const first = await spin(db, ME, () => 0);
    await expect(
      undoAndRespin(db, first.spinId, ME, () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    const [row] = await db.select().from(spins);
    expect(row.undoneAt).toBeNull();
  });
});

describe("listHistory", () => {
  it("includes removed winners and resolves emails to names", async () => {
    await spin(db, ME, () => 0); // P1 wins
    await db.update(people).set({ active: false }).where(eq(people.id, 1));
    await undoSpin(db, 1, "stranger@visibuild.com");
    await db.insert(weightChanges).values({
      personId: 2,
      oldShare: 0.3,
      newShare: 0.4,
      changedBy: "person2@visibuild.com",
    });
    const { spins: ss, weightChanges: ws } = await listHistory(db);
    expect(ss).toHaveLength(1);
    expect(ss[0].winner.name).toBe("P1");
    expect(ss[0].winner.active).toBe(false);
    expect(ss[0].spunByName).toBe("P1");
    expect(ss[0].undoneByName).toBe("stranger@visibuild.com");
    expect(ws[0].person.name).toBe("P2");
    expect(ws[0].changedByName).toBe("P2");
  });
});
