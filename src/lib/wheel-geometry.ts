export type SliceAngle = { start: number; end: number; mid: number };

/** Degrees, clockwise from 12 o'clock. Normalised so the last slice ends at exactly 360. */
export function sliceAngles(shares: number[]): SliceAngle[] {
  const total = shares.reduce((s, x) => s + x, 0) || 1;
  let acc = 0;
  return shares.map((share, i) => {
    const start = (acc / total) * 360;
    acc += share;
    const end = i === shares.length - 1 ? 360 : (acc / total) * 360;
    return { start, end, mid: (start + end) / 2 };
  });
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/**
 * The smallest rotation ≥ currentRotation + fullTurns·360 that puts the
 * slice angle `winnerMid + jitter` under the top pointer.
 */
export function targetRotation(
  currentRotation: number,
  winnerMid: number,
  fullTurns = 5,
  jitter = 0,
): number {
  const min = currentRotation + fullTurns * 360;
  return min + mod(-(winnerMid + jitter) - min, 360);
}

/** Rounds generated SVG coordinates so server and client render identical strings. */
export const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Point on a circle centred at (cx, cy); angle in degrees clockwise from 12 o'clock. */
export function polar(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: round3(cx + r * Math.cos(rad)), y: round3(cy + r * Math.sin(rad)) };
}

/** SVG path for a pie slice. Callers draw a full circle when the slice is 360°. */
export function slicePath(cx: number, cy: number, r: number, start: number, end: number): string {
  const a = polar(cx, cy, r, start);
  const b = polar(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${a.x} ${a.y} A ${round3(r)} ${round3(r)} 0 ${large} 1 ${b.x} ${b.y} Z`;
}
