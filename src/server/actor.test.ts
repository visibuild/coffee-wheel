import { beforeEach, describe, expect, it } from "vitest";
import { makeTestDb } from "../../tests/helpers/db";
import { people } from "@/db/schema";
import type { Db } from "@/db/client";
import { loadActor } from "./actor";

let db: Db;
beforeEach(async () => {
  db = await makeTestDb();
});

describe("loadActor", () => {
  it("seed admin exists", async () => {
    const actor = await loadActor(db, "Dave@Visibuild.com ");
    expect(actor).toMatchObject({ email: "dave@visibuild.com", isAdmin: true, person: null });
  });

  it("links active person by email case-insensitively", async () => {
    await db.insert(people).values({ name: "Priya", email: "priya@visibuild.com", weight: 1 });
    const actor = await loadActor(db, "PRIYA@visibuild.com");
    expect(actor.person?.name).toBe("Priya");
    expect(actor.isAdmin).toBe(false);
  });

  it("ignores removed person", async () => {
    await db
      .insert(people)
      .values({ name: "Priya", email: "priya@visibuild.com", weight: 0, active: false });
    const actor = await loadActor(db, "priya@visibuild.com");
    expect(actor.person).toBeNull();
  });
});
