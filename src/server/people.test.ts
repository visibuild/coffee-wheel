import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { admins, people, slackEmojis, weightChanges } from "@/db/schema";
import { NOT_ON_WHEEL } from "@/lib/copy";
import { makeTestDb } from "../../tests/helpers/db";
import {
  addPerson,
  removePerson,
  resetPersonStyle,
  setPersonShare,
  updateMyProfile,
  updatePerson,
} from "./people";
import { lockWheel } from "./weights-store";
import { spin } from "./wheel";

const ADMIN = "dave@visibuild.com";
let db: Db;

async function seed(n = 3) {
  for (let i = 1; i <= n; i++) {
    await db.insert(people).values({
      name: `P${i}`,
      email: `person${i}@visibuild.com`,
      weight: 1 / n,
    });
  }
}
async function activeSum() {
  const rows = await db.select().from(people).where(eq(people.active, true));
  return rows.reduce((s, r) => s + r.weight, 0);
}
const code = (p: Promise<unknown>) =>
  p.then(
    () => "ok",
    (e) => e.code,
  );

beforeEach(async () => {
  db = await makeTestDb();
  await seed();
});

describe("addPerson", () => {
  it("add normalises email", async () => {
    const p = await addPerson(db, ADMIN, {
      name: "Priya",
      email: " Priya@Visibuild.com ",
    });
    expect(p.email).toBe("priya@visibuild.com");
  });

  it("add gives 1/n", async () => {
    for (let i = 0; i < 3; i++) await spin(db, "person1@visibuild.com");
    const p = await addPerson(db, ADMIN, { name: "N", email: "n@visibuild.com" });
    expect(p.weight).toBeCloseTo(1 / 4, 9);
    expect(await activeSum()).toBeCloseTo(1, 9);
  });

  it("re-add restores removed person case-insensitively", async () => {
    await db
      .update(people)
      .set({ emoji: { kind: "native", value: "🐙" }, color: "#aabbcc" })
      .where(eq(people.id, 2));
    await removePerson(db, ADMIN, 2);
    const p = await addPerson(db, ADMIN, {
      name: "Renamed",
      email: "PERSON2@visibuild.com",
    });
    expect(p.id).toBe(2);
    expect(p.active).toBe(true);
    expect(p.name).toBe("Renamed");
    expect(p.emoji).toEqual({ kind: "native", value: "🐙" });
    expect(p.color).toBe("#aabbcc");
    expect(p.weight).toBeCloseTo(1 / 3, 9);
    expect(await activeSum()).toBeCloseTo(1, 9);
  });

  it("add rejects duplicate active email", async () => {
    expect(
      await code(
        addPerson(db, ADMIN, { name: "X", email: "Person1@visibuild.com" }),
      ),
    ).toBe("CONFLICT");
  });

  it("add rejects non-visibuild email", async () => {
    expect(
      await code(addPerson(db, ADMIN, { name: "X", email: "x@gmail.com" })),
    ).toBe("INVALID");
  });

  it("non-admin cannot add person", async () => {
    expect(
      await code(
        addPerson(db, "person1@visibuild.com", {
          name: "X",
          email: "x@visibuild.com",
        }),
      ),
    ).toBe("FORBIDDEN");
  });
});

describe("removePerson / updatePerson", () => {
  it("remove renormalises and hides from wheel", async () => {
    await removePerson(db, ADMIN, 1);
    const [gone] = await db.select().from(people).where(eq(people.id, 1));
    expect(gone.active).toBe(false);
    expect(await activeSum()).toBeCloseTo(1, 9);
    const [two] = await db.select().from(people).where(eq(people.id, 2));
    expect(two.weight).toBeCloseTo(0.5, 9);
  });

  it("remove unknown or already removed person is NOT_FOUND", async () => {
    expect(await code(removePerson(db, ADMIN, 99))).toBe("NOT_FOUND");
    await removePerson(db, ADMIN, 1);
    expect(await code(removePerson(db, ADMIN, 1))).toBe("NOT_FOUND");
  });

  it("update validates and normalises email", async () => {
    const p = await updatePerson(db, ADMIN, 1, {
      name: "New",
      email: " NEW@Visibuild.com",
    });
    expect(p.name).toBe("New");
    expect(p.email).toBe("new@visibuild.com");
    expect(
      await code(updatePerson(db, ADMIN, 1, { email: "a@gmail.com" })),
    ).toBe("INVALID");
    expect(
      await code(updatePerson(db, ADMIN, 1, { email: "person2@visibuild.com" })),
    ).toBe("CONFLICT");
  });
});

describe("setPersonShare", () => {
  it("setPersonShare logs change", async () => {
    await setPersonShare(db, ADMIN, 1, 0.5);
    const rows = await db.select().from(weightChanges);
    expect(rows).toHaveLength(1);
    expect(rows[0].personId).toBe(1);
    expect(rows[0].oldShare).toBeCloseTo(1 / 3, 9);
    expect(rows[0].newShare).toBeCloseTo(0.5, 9);
    expect(rows[0].changedBy).toBe(ADMIN);
    expect(await activeSum()).toBeCloseTo(1, 9);
  });

  it("rejects out-of-range share", async () => {
    expect(await code(setPersonShare(db, ADMIN, 1, 1.5))).toBe("INVALID");
  });
});

describe("profile", () => {
  const ME = "person1@visibuild.com";

  it("profile requires being on wheel", async () => {
    await expect(
      updateMyProfile(db, "stranger@visibuild.com", { color: "#aabbcc" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", message: NOT_ON_WHEEL });
  });

  it("profile rejects bad colour", async () => {
    expect(await code(updateMyProfile(db, ME, { color: "red" }))).toBe(
      "INVALID",
    );
  });

  it("sets colour", async () => {
    const p = await updateMyProfile(db, ME, { color: "#AABBCC" });
    expect(p.color).toBe("#AABBCC");
  });

  it("slack emoji url comes from cache", async () => {
    await db
      .insert(slackEmojis)
      .values({ name: "party", url: "https://cache/party.png" });
    const p = await updateMyProfile(db, ME, {
      emoji: { kind: "slack", name: "party", url: "https://evil/x.png" },
    });
    expect(p.emoji).toEqual({
      kind: "slack",
      name: "party",
      url: "https://cache/party.png",
    });
    expect(
      await code(
        updateMyProfile(db, ME, {
          emoji: { kind: "slack", name: "nope", url: "u" },
        }),
      ),
    ).toBe("INVALID");
  });

  it("emoji null clears it", async () => {
    await updateMyProfile(db, ME, { emoji: { kind: "native", value: "🐙" } });
    const p = await updateMyProfile(db, ME, { emoji: null });
    expect(p.emoji).toBeNull();
  });

  it("admin can reset emoji", async () => {
    await db
      .update(people)
      .set({ emoji: { kind: "native", value: "🐙" }, color: "#aabbcc" })
      .where(eq(people.id, 1));
    const p = await resetPersonStyle(db, ADMIN, 1, { emoji: true });
    expect(p.emoji).toBeNull();
    expect(p.color).toBe("#aabbcc");
    expect(
      await code(resetPersonStyle(db, ME, 1, { color: true })),
    ).toBe("FORBIDDEN");
  });
});

it("admins table is seeded", async () => {
  const rows = await db.select().from(admins);
  expect(rows.map((r) => r.email)).toContain(ADMIN);
});

describe("weight locking", () => {
  it("restore after a spin keeps weights summing to 1", async () => {
    await removePerson(db, ADMIN, 3);
    await spin(db, "person1@visibuild.com", () => 0);
    await addPerson(db, ADMIN, { name: "P3", email: "person3@visibuild.com" });
    expect(await activeSum()).toBeCloseTo(1, 9);
    await spin(db, "person1@visibuild.com", () => 0.99);
    expect(await activeSum()).toBeCloseTo(1, 9);
  });

  it("lockWheel is callable on PGlite", async () => {
    await expect(db.transaction((tx) => lockWheel(tx))).resolves.toBeUndefined();
  });
});
