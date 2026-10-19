import { randomInt } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import { people, spins, type Emoji, type SpinRow } from "@/db/schema";
import {
  applySpin,
  applyUndo,
  pickWinner,
  shareOf,
} from "@/lib/weights";
import { loadActor, normEmail } from "./actor";
import { AppError } from "./errors";
import { lockActive, writeWeights, type PersonRow } from "./weights-store";
import { NOT_ON_WHEEL } from "@/lib/copy";

export type WheelPerson = {
  id: number;
  name: string;
  email: string;
  share: number;
  color: string | null;
  emoji: Emoji | null;
};

export type SpinResult = {
  spinId: number;
  winnerId: number;
  chance: number;
  /** State before halving, for the animation. */
  people: WheelPerson[];
};

const defaultRand = () => randomInt(0, 2 ** 32) / 2 ** 32;

const toWheelPerson = (p: PersonRow): WheelPerson => ({
  id: p.id,
  name: p.name,
  email: p.email,
  share: p.weight,
  color: p.color,
  emoji: p.emoji,
});

export async function getWheelState(
  db: Db,
): Promise<{ people: WheelPerson[] }> {
  const rows = await db
    .select()
    .from(people)
    .where(eq(people.active, true))
    .orderBy(asc(people.id));
  return { people: rows.map(toWheelPerson) };
}

async function requireWheelPerson(tx: Db, actorEmail: string) {
  const actor = await loadActor(tx, actorEmail);
  if (!actor.person)
    throw new AppError("FORBIDDEN", NOT_ON_WHEEL);
  return actor;
}

async function spinIn(
  tx: Db,
  actorEmail: string,
  rand: () => number,
): Promise<SpinResult> {
  const rows = await lockActive(tx);
  if (rows.length === 0)
    throw new AppError("INVALID", "No one on the wheel yet");
  const { email: spunBy } = await requireWheelPerson(tx, actorEmail);
  const entries = rows.map((r) => ({ id: r.id, weight: r.weight }));
  const winnerId = pickWinner(entries, rand());
  const chance = shareOf(entries, winnerId);
  await writeWeights(tx, rows, applySpin(entries, winnerId));
  const [row] = await tx
    .insert(spins)
    .values({ winnerId, spunBy, chance })
    .returning();
  return { spinId: row.id, winnerId, chance, people: rows.map(toWheelPerson) };
}

async function undoIn(
  tx: Db,
  spinId: number,
  actorEmail: string,
): Promise<SpinRow> {
  const [row] = await tx
    .update(spins)
    .set({ undoneAt: new Date(), undoneBy: normEmail(actorEmail) })
    .where(and(eq(spins.id, spinId), isNull(spins.undoneAt)))
    .returning();
  if (!row) {
    const [existing] = await tx
      .select({ id: spins.id })
      .from(spins)
      .where(eq(spins.id, spinId));
    throw existing
      ? new AppError("CONFLICT", "That spin was already undone")
      : new AppError("NOT_FOUND", "Spin not found");
  }
  const rows = await lockActive(tx);
  if (rows.some((r) => r.id === row.winnerId)) {
    const entries = rows.map((r) => ({ id: r.id, weight: r.weight }));
    await writeWeights(tx, rows, applyUndo(entries, row.winnerId));
  }
  return row;
}

export async function spin(
  db: Db,
  actorEmail: string,
  rand: () => number = defaultRand,
): Promise<SpinResult> {
  return db.transaction(async (tx) => {
    return spinIn(tx, actorEmail, rand);
  });
}

export async function undoSpin(
  db: Db,
  spinId: number,
  actorEmail: string,
): Promise<{ spin: SpinRow }> {
  return db.transaction(async (tx) => ({
    spin: await undoIn(tx, spinId, actorEmail),
  }));
}

export async function undoAndRespin(
  db: Db,
  spinId: number,
  actorEmail: string,
  rand: () => number = defaultRand,
): Promise<{ undone: SpinRow; result: SpinResult }> {
  return db.transaction(async (tx) => {
    const actor = await requireWheelPerson(tx, actorEmail);
    const undone = await undoIn(tx, spinId, actor.email);
    return { undone, result: await spinIn(tx, actor.email, rand) };
  });
}
