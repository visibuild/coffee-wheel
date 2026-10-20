import { defaultColor, formatPct } from "@/lib/display";
import type { WheelPerson } from "@/server/wheel";
import { EmojiBadge } from "./EmojiBadge";

export function OddsFoldout({ people }: { people: WheelPerson[] }) {
  const sorted = [...people].sort((a, b) => b.share - a.share || a.name.localeCompare(b.name));
  const max = sorted[0]?.share ?? 1;
  return (
    <details className="group w-full max-w-2xl">
      <summary className="mx-auto flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100/70 [&::-webkit-details-marker]:hidden">
        <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 transition-transform group-open:rotate-90">
          <path d="M7 5l6 5-6 5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="group-open:hidden">Show everyone&apos;s odds</span>
        <span className="hidden group-open:inline">Hide everyone&apos;s odds</span>
      </summary>
      <ul
        aria-label="Everyone's odds"
        className="mt-3 grid gap-x-6 gap-y-1 rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-stone-200 sm:grid-cols-2"
      >
        {sorted.map((p) => {
          const color = p.color ?? defaultColor(p.id);
          return (
            <li key={p.id} className="flex items-center gap-2.5 py-1 text-sm">
              <EmojiBadge emoji={p.emoji} name={p.name} color={color} size={22} />
              <span className="min-w-0 flex-1 truncate font-medium text-stone-800">{p.name}</span>
              <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-stone-100 sm:block" aria-hidden>
                <span className="block h-full rounded-full" style={{ width: `${(p.share / max) * 100}%`, background: color }} />
              </span>
              <span className="w-12 text-right tabular-nums text-stone-500">{formatPct(p.share)}</span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
