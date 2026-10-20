import type { Db } from "@/db/client";
import { slackEmojis } from "@/db/schema";
import { parseEmojiList } from "@/lib/slack-emoji";
import type { SlackClient } from "./slack-client";

/** Replaces the cached custom emoji; the fetch happens first so a failure leaves rows untouched. */
export async function refreshSlackEmojis(db: Db, client: SlackClient): Promise<{ count: number }> {
  const emojis = parseEmojiList(await client.listEmoji());
  await db.transaction(async (tx) => {
    await tx.delete(slackEmojis);
    if (emojis.length > 0) await tx.insert(slackEmojis).values(emojis);
  });
  return { count: emojis.length };
}
