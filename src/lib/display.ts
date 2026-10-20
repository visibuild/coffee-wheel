const PALETTE = [
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ec4899", // pink
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ef4444", // red
  "#14b8a6", // teal
  "#f97316", // orange
  "#0ea5e9", // sky
  "#a855f7", // purple
  "#65a30d", // lime
  "#e11d48", // rose
];

/** Stable colour for people who haven't picked one. */
export function defaultColor(personId: number): string {
  return PALETTE[((personId % PALETTE.length) + PALETTE.length) % PALETTE.length];
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function formatPct(share: number): string {
  return `${(share * 100).toFixed(1)}%`;
}

const dateParts = new Intl.DateTimeFormat("en-AU", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Australia/Melbourne",
});

/** "Tue 20 Oct", in Melbourne time. */
export function formatDate(d: Date): string {
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    dateParts.formatToParts(d).find((p) => p.type === type)?.value ?? "";
  return `${part("weekday")} ${part("day")} ${part("month")}`;
}

const timeFormat = new Intl.DateTimeFormat("en-AU", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Australia/Melbourne",
});

/** "9:41 am", in Melbourne time. */
export function formatTime(d: Date): string {
  return timeFormat.format(d).replace(/\s/g, " ").toLowerCase();
}

/** Winner-card heading size: 54px, shrinking for long text so it fits two lines. */
export function headingFontSize(text: string): number {
  if (text.length <= 26) return 54;
  if (text.length <= 38) return 42;
  return 32;
}
