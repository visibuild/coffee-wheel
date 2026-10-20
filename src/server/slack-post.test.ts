import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db/client";
import { people, spins } from "@/db/schema";
import { makeTestDb } from "../../tests/helpers/db";
import type { SlackClient } from "./slack-client";
import { postSpinToSlack, replyUndone } from "./slack-post";

let db: Db;
const render = async () => Buffer.from("png");

function fakeClient(over: Partial<SlackClient> = {}): SlackClient & {
  uploadImage: ReturnType<typeof vi.fn>;
  replyInThread: ReturnType<typeof vi.fn>;
  findShareTs: ReturnType<typeof vi.fn>;
} {
  return {
    listEmoji: vi.fn(),
    uploadImage: vi.fn(async () => ({ fileId: "F1" })),
    findShareTs: vi.fn(async () => "123.45"),
    replyInThread: vi.fn(async () => {}),
    lookupUserIdByEmail: vi.fn(async () => "U1"),
    ...over,
  } as never;
}

async function spinRow() {
  const [r] = await db.select().from(spins).where(eq(spins.id, 1));
  return r;
}

beforeEach(async () => {
  process.env.SLACK_CHANNEL_ID = "C1";
  db = await makeTestDb();
  await db.insert(people).values({ name: "Ann Lee", email: "ann@visibuild.com", weight: 1 });
  await db.insert(spins).values({ winnerId: 1, spunBy: "ann@visibuild.com", chance: 0.5 });
});
afterEach(() => {
  delete process.env.SLACK_CHANNEL_ID;
  vi.restoreAllMocks();
});

describe("postSpinToSlack", () => {
  it("posts image with mention and records file", async () => {
    const c = fakeClient();
    expect(await postSpinToSlack(db, c, 1, render)).toEqual({ fileId: "F1" });
    expect(c.uploadImage.mock.calls[0][0].comment).toContain("<@U1>");
    expect(c.uploadImage.mock.calls[0][0].channel).toBe("C1");
    const r = await spinRow();
    expect(r.slackFileId).toBe("F1");
    expect(r.slackChannel).toBe("C1");
  });

  it("falls back to plain name when user not found", async () => {
    const c = fakeClient({ lookupUserIdByEmail: vi.fn(async () => null) });
    await postSpinToSlack(db, c, 1, render);
    expect(c.uploadImage.mock.calls[0][0].comment).toBe("☕ Ann Lee picks the café this week!");
  });

  it("rejects when slack is not configured", async () => {
    await expect(postSpinToSlack(db, null, 1, render)).rejects.toMatchObject({ code: "INVALID" });
  });

  it("rejects second post", async () => {
    const c = fakeClient();
    await postSpinToSlack(db, c, 1, render);
    await expect(postSpinToSlack(db, c, 1, render)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(c.uploadImage).toHaveBeenCalledTimes(1);
  });

  it("uploads at most once for concurrent posts", async () => {
    const c = fakeClient();
    const results = await Promise.allSettled([
      postSpinToSlack(db, c, 1, render),
      postSpinToSlack(db, c, 1, render),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(c.uploadImage).toHaveBeenCalledTimes(1);
  });

  it("post failure leaves spin unposted", async () => {
    const c = fakeClient({ uploadImage: vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue({ fileId: "F1" }) });
    await expect(postSpinToSlack(db, c, 1, render)).rejects.toThrow("boom");
    const r = await spinRow();
    expect(r.slackFileId).toBeNull();
    expect(r.slackChannel).toBeNull();
    await expect(postSpinToSlack(db, c, 1, render)).resolves.toEqual({ fileId: "F1" });
  });

  it("rejects posting an undone spin", async () => {
    await db.update(spins).set({ undoneAt: new Date() });
    const c = fakeClient();
    await expect(postSpinToSlack(db, c, 1, render)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(c.uploadImage).not.toHaveBeenCalled();
  });
});

describe("replyUndone", () => {
  beforeEach(async () => {
    await db.update(spins).set({ slackChannel: "C1", slackFileId: "F1", undoneAt: new Date() });
  });

  it("undo reply posts in thread", async () => {
    const c = fakeClient();
    await replyUndone(db, c, 1, [0, 0, 0]);
    expect(c.replyInThread).toHaveBeenCalledWith("C1", "123.45", "Undone — respinning");
    expect((await spinRow()).slackTs).toBe("123.45");
  });

  it("uses the cached ts without lookup", async () => {
    await db.update(spins).set({ slackTs: "9.9" });
    const c = fakeClient();
    await replyUndone(db, c, 1, [0, 0, 0]);
    expect(c.findShareTs).not.toHaveBeenCalled();
    expect(c.replyInThread).toHaveBeenCalledWith("C1", "9.9", "Undone — respinning");
  });

  it("retries findShareTs until the share appears", async () => {
    const c = fakeClient({
      findShareTs: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValue("5.5"),
    });
    await replyUndone(db, c, 1, [0, 0, 0]);
    expect(c.findShareTs).toHaveBeenCalledTimes(3);
    expect(c.replyInThread).toHaveBeenCalledWith("C1", "5.5", "Undone — respinning");
  });

  it("gives up quietly when no ts is ever found", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const c = fakeClient({ findShareTs: vi.fn(async () => null) });
    await expect(replyUndone(db, c, 1, [0, 0, 0])).resolves.toBeUndefined();
    expect(c.findShareTs).toHaveBeenCalledTimes(4);
    expect(c.replyInThread).not.toHaveBeenCalled();
  });

  it("does nothing for a spin that was never posted", async () => {
    await db.update(spins).set({ slackChannel: null, slackFileId: null });
    const c = fakeClient();
    await replyUndone(db, c, 1, [0, 0, 0]);
    expect(c.replyInThread).not.toHaveBeenCalled();
  });

  it("does nothing without a client", async () => {
    await expect(replyUndone(db, null, 1)).resolves.toBeUndefined();
  });

  it("undo succeeds when slack reply fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const c = fakeClient({ replyInThread: vi.fn().mockRejectedValue(new Error("down")) });
    await expect(replyUndone(db, c, 1, [0, 0, 0])).resolves.toBeUndefined();
    expect((await spinRow()).undoneAt).not.toBeNull();
  });
});
