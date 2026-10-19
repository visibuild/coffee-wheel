import { asc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { people } from "@/db/schema";
import type { WeightEntry } from "@/lib/weights";

export type PersonRow = typeof people.$inferSelect;

const WHEEL_LOCK_KEY = 4_242_001;

/**
 * Transaction-scoped advisory lock taken before any weight-affecting work.
 * Row locks alone are not enough: under READ COMMITTED, a transaction blocked
 * on `FOR UPDATE` keeps its statement snapshot and misses rows added or
 * reactivated by the transaction it waited for (and with no active people
 * nothing is locked at all). Take this first, then call `lockActive` as a
 * fresh statement.
 */
export async function lockWheel(tx: Db): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(${WHEEL_LOCK_KEY})`);
}

/** Active people ordered by id, row-locked so concurrent weight changes serialise. */
export function lockActive(tx: Db): Promise<PersonRow[]> {
  return tx
    .select()
    .from(people)
    .where(eq(people.active, true))
    .orderBy(asc(people.id))
    .for("update");
}

/** Writes back only the weights that differ from the locked rows. */
export async function writeWeights(
  tx: Db,
  rows: PersonRow[],
  next: WeightEntry[],
) {
  for (const e of next) {
    const old = rows.find((r) => r.id === e.id);
    if (old && old.weight !== e.weight) {
      await tx
        .update(people)
        .set({ weight: e.weight })
        .where(eq(people.id, e.id));
    }
  }
}
