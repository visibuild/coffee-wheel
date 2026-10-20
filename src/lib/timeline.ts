import type { Person, SpinRow, WeightChangeRow } from "@/db/schema";

export type HistorySpin = SpinRow & {
  winner: Person;
  /** Display names: a person's name where one exists, else the email. */
  spunByName: string;
  undoneByName: string | null;
};
export type HistoryWeightChange = WeightChangeRow & { person: Person; changedByName: string };

export type TimelineItem =
  | { kind: "spin"; at: Date; spin: HistorySpin }
  | { kind: "weight"; at: Date; change: HistoryWeightChange };

/** Spins and weight changes merged into one list, newest first. */
export function buildTimeline(
  spins: HistorySpin[],
  weightChanges: HistoryWeightChange[],
): TimelineItem[] {
  const items: TimelineItem[] = [
    ...spins.map((spin) => ({ kind: "spin" as const, at: spin.createdAt!, spin })),
    ...weightChanges.map((change) => ({ kind: "weight" as const, at: change.createdAt!, change })),
  ];
  return items.sort((a, b) => b.at.getTime() - a.at.getTime());
}
