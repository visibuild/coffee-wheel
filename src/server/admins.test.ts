import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { addAdmin, listAdmins, removeAdmin } from "./admins";
import { makeTestDb } from "../../tests/helpers/db";

const DAVE = "dave@visibuild.com";
let db: Db;

beforeEach(async () => {
  db = await makeTestDb();
});

describe("admins", () => {
  it("seed admin can add admin", async () => {
    await addAdmin(db, DAVE, "sam@visibuild.com");
    const list = await listAdmins(db);
    expect(list.map((a) => a.email).sort()).toEqual([
      DAVE,
      "sam@visibuild.com",
    ]);
    expect(list.find((a) => a.email === "sam@visibuild.com")!.addedBy).toBe(DAVE);
  });

  it("non-admin cannot add admin", async () => {
    await expect(
      addAdmin(db, "rando@visibuild.com", "x@visibuild.com"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects non-visibuild admin email", async () => {
    await expect(addAdmin(db, DAVE, "x@gmail.com")).rejects.toMatchObject({
      code: "INVALID",
    });
  });

  it("can't remove the last admin", async () => {
    await expect(removeAdmin(db, DAVE, DAVE)).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Can't remove the last admin",
    });
  });

  it("can remove self when another admin exists", async () => {
    await addAdmin(db, DAVE, "sam@visibuild.com");
    await removeAdmin(db, DAVE, DAVE);
    expect((await listAdmins(db)).map((a) => a.email)).toEqual([
      "sam@visibuild.com",
    ]);
  });

  it("add admin is idempotent and normalised", async () => {
    await addAdmin(db, DAVE, " Sam@Visibuild.com ");
    await addAdmin(db, DAVE, "sam@visibuild.com");
    const list = await listAdmins(db);
    expect(list.filter((a) => a.email === "sam@visibuild.com")).toHaveLength(1);
  });

  it("removing a non-admin is NOT_FOUND", async () => {
    await expect(
      removeAdmin(db, DAVE, "ghost@visibuild.com"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
