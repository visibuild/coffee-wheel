import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import { people, spins } from "@/db/schema";
import { defaultColor } from "@/lib/display";
import { AppError } from "./errors";
import type { SlackClient } from "./slack-client";
import { renderWinnerCardPng } from "./winner-card";

/** Emails are stored lowercased and trimmed. */
const norm = (email: string) => email.trim().toLowerCase();

/**
 * Uploads the winner card for a spin to Slack. The spin is claimed first (atomic conditional
 * UPDATE), so concurrent clicks upload at most once; the claim is released if the upload fails.
 */
export async function postSpinToSlack(
  db: Db,
  client: SlackClient | null,
  spinId: number,
  render: typeof renderWinnerCardPng = renderWinnerCardPng,
): Promise<{ fileId: string }> {
  const channel = process.env.SLACK_CHANNEL_ID;
  if (!client || !channel) throw new AppError("INVALID", "Slack isn't configured");

  const [row] = await db
    .select({ spin: spins, winner: people })
    .from(spins)
    .innerJoin(people, eq(spins.winnerId, people.id))
    .where(eq(spins.id, spinId));
  if (!row) throw new AppError("NOT_FOUND", "Spin not found");
  if (row.spin.undoneAt) throw new AppError("CONFLICT", "That spin was undone");
  if (row.spin.slackFileId || row.spin.slackChannel) throw new AppError("CONFLICT", "Already posted");

  const claimed = await db
    .update(spins)
    .set({ slackChannel: channel })
    .where(
      and(
        eq(spins.id, spinId),
        isNull(spins.slackFileId),
        isNull(spins.slackChannel),
        isNull(spins.undoneAt),
      ),
    )
    .returning({ id: spins.id });
  if (claimed.length === 0) throw new AppError("CONFLICT", "Already posted");

  try {
    const [spinner] = await db
      .select({ name: people.name })
      .from(people)
      .where(eq(people.email, norm(row.spin.spunBy)));
    const { winner } = row;
    const png = await render({
      date: row.spin.createdAt ?? new Date(),
      winnerName: winner.name,
      emoji: winner.emoji ?? null,
      color: winner.color ?? defaultColor(winner.id),
      spinnerName: spinner?.name ?? row.spin.spunBy,
      chance: row.spin.chance,
    });
    const userId = await client.lookupUserIdByEmail(norm(winner.email));
    const { fileId } = await client.uploadImage({
      channel,
      png,
      filename: "coffee-winner.png",
      comment: `☕ ${userId ? `<@${userId}>` : winner.name} picks the café this week!`,
    });
    await db.update(spins).set({ slackFileId: fileId }).where(eq(spins.id, spinId));
    return { fileId };
  } catch (e) {
    // Release the claim so a retry can work. If the upload actually succeeded but storing
    // the id failed, we can't know; releasing is the safer default.
    await db
      .update(spins)
      .set({ slackChannel: null })
      .where(and(eq(spins.id, spinId), isNull(spins.slackFileId)));
    throw e;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Replies in the winner card's thread. Never throws: Slack must not affect an undo. */
export async function replyUndone(
  db: Db,
  client: SlackClient | null,
  spinId: number,
  retryDelaysMs: number[] = [500, 1000, 2000],
): Promise<void> {
  if (!client) return;
  try {
    const [row] = await db.select().from(spins).where(eq(spins.id, spinId));
    if (!row?.slackFileId || !row.slackChannel) return;
    let ts = row.slackTs;
    if (!ts) {
      // Slack fills in `shares` asynchronously after an upload, so retry briefly.
      ts = await client.findShareTs(row.slackFileId, row.slackChannel);
      for (const delay of retryDelaysMs) {
        if (ts) break;
        await sleep(delay);
        ts = await client.findShareTs(row.slackFileId, row.slackChannel);
      }
      if (!ts) {
        console.error(`Slack: no message ts found for spin ${spinId}; undo reply skipped`);
        return;
      }
      await db.update(spins).set({ slackTs: ts }).where(eq(spins.id, spinId));
    }
    await client.replyInThread(row.slackChannel, ts, "Undone — respinning");
  } catch (e) {
    console.error(`Slack: undo reply failed for spin ${spinId}`, e);
  }
}
