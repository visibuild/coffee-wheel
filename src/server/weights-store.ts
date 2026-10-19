import { asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { people } from "@/db/schema";
import type { WeightEntry } from "@/lib/weights";

export type PersonRow = typeof people.$inferSelect;

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
