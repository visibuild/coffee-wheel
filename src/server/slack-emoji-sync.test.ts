import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { slackEmojis } from "@/db/schema";
import { makeTestDb } from "../../tests/helpers/db";
import type { SlackClient } from "./slack-client";
import { refreshSlackEmojis } from "./slack-emoji-sync";

let db: Db;
beforeEach(async () => {
  db = await makeTestDb();
});

function fakeClient(listEmoji: SlackClient["listEmoji"]): SlackClient {
  return { listEmoji } as SlackClient;
}

describe("refreshSlackEmojis", () => {
  it("refresh replaces cache", async () => {
    await db.insert(slackEmojis).values({ name: "old", url: "https://e/old.png" });
    const client = fakeClient(async () => ({ party: "https://e/p.gif", yay: "alias:party" }));
    expect(await refreshSlackEmojis(db, client)).toEqual({ count: 2 });
    const rows = await db.select().from(slackEmojis);
    expect(rows.map((r) => r.name).sort()).toEqual(["party", "yay"]);
  });

  it("failed refresh keeps cache", async () => {
    await db.insert(slackEmojis).values({ name: "old", url: "https://e/old.png" });
    const client = fakeClient(async () => {
      throw new Error("slack down");
    });
    await expect(refreshSlackEmojis(db, client)).rejects.toThrow("slack down");
    const rows = await db.select().from(slackEmojis);
    expect(rows.map((r) => r.name)).toEqual(["old"]);
  });
});
