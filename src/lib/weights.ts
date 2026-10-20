export type WeightEntry = { id: number; weight: number };

export function normalize(entries: WeightEntry[]): WeightEntry[] {
  if (entries.length === 0) return [];
  const total = entries.reduce((s, e) => s + e.weight, 0);
  return entries.map((e) => ({ id: e.id, weight: e.weight / total }));
}

function scaleWinner(entries: WeightEntry[], winnerId: number, factor: number): WeightEntry[] {
  return normalize(
    entries.map((e) => (e.id === winnerId ? { id: e.id, weight: e.weight * factor } : { ...e })),
  );
}

// Moves the winner's share to `target` and scales everyone else proportionally to fill the rest.
function retarget(entries: WeightEntry[], winnerId: number, current: number, target: number) {
  const k = (1 - target) / (1 - current);
  return entries.map((e) => ({ id: e.id, weight: e.id === winnerId ? target : e.weight * k }));
}

// Spin halves the winner's share (80% -> 40%); everyone else scales up to fill the rest.
export function applySpin(entries: WeightEntry[], winnerId: number): WeightEntry[] {
  const norm = normalize(entries);
  const s = shareOf(norm, winnerId);
  if (norm.length <= 1 || s === 0) return norm;
  return retarget(norm, winnerId, s, s / 2);
}

// Undo doubles the winner's share back (exact for the most recent spin). If doubling would
// reach 100% (an old spin on a small wheel), fall back to doubling the relative weight.
export function applyUndo(entries: WeightEntry[], winnerId: number): WeightEntry[] {
  const norm = normalize(entries);
  const t = shareOf(norm, winnerId);
  if (norm.length <= 1 || t === 0) return norm;
  if (2 * t >= 1) return scaleWinner(norm, winnerId, 2);
  return retarget(norm, winnerId, t, 2 * t);
}

export function addEntry(entries: WeightEntry[], newId: number): WeightEntry[] {
  const n = entries.length + 1;
  const share = 1 / n;
  const others = normalize(entries).map((e) => ({ id: e.id, weight: e.weight * (1 - share) }));
  return [...others, { id: newId, weight: share }];
}

export function removeEntry(entries: WeightEntry[], id: number): WeightEntry[] {
  return normalize(entries.filter((e) => e.id !== id));
}

export function setShare(entries: WeightEntry[], id: number, share: number): WeightEntry[] {
  if (entries.length === 1) return [{ id: entries[0].id, weight: 1 }];
  if (!(share > 0 && share < 1)) {
    throw new RangeError(`share must be between 0 and 1 exclusive, got ${share}`);
  }
  const othersTotal = entries.reduce((s, e) => (e.id === id ? s : s + e.weight), 0);
  return entries.map((e) =>
    e.id === id
      ? { id: e.id, weight: share }
      : { id: e.id, weight: (e.weight / othersTotal) * (1 - share) },
  );
}

export function pickWinner(entries: WeightEntry[], rand: number): number {
  if (entries.length === 0) throw new RangeError("cannot pick a winner from no entries");
  let cumulative = 0;
  for (const e of entries) {
    cumulative += e.weight;
    if (rand < cumulative) return e.id;
  }
  return entries[entries.length - 1].id;
}

export function shareOf(entries: WeightEntry[], id: number): number {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  const entry = entries.find((e) => e.id === id);
  return entry && total > 0 ? entry.weight / total : 0;
}
