import type { Emoji } from "@/db/schema";
import { TEST_SPIN_BADGE } from "@/lib/copy";
import { formatPct } from "@/lib/display";
import { EmojiBadge } from "./EmojiBadge";

type Props = {
  name: string;
  emoji: Emoji | null;
  color: string;
  chance: number;
  spunBy: string;
  /** A client-only test spin: no Slack, no undo. */
  test?: boolean;
  onSpinForReal?: () => void;
  date: string;
  busy: boolean;
  error: string | null;
  slackState: "idle" | "posting" | "posted";
  slackError: string | null;
  onPostToSlack: () => void;
  onUndo: () => void;
  onUndoAndRespin: () => void;
  onClose: () => void;
};

const CONFETTI = ["#f59e0b", "#ec4899", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444"];

export function WinnerCard(p: Props) {
  return (
    <div className="winner-card relative w-[min(320px,calc(100vw-32px))]">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-10">
        {Array.from({ length: 26 }, (_, i) => {
          // Deterministic scatter: no randomness during render.
          const angle = (i / 26) * Math.PI * 2 + (i % 3) * 0.3;
          const dist = 110 + ((i * 37) % 70);
          return (
            <span
              key={i}
              className="confetti"
              style={
                {
                  "--dx": `${Math.cos(angle) * dist}px`,
                  "--dy": `${Math.sin(angle) * dist - 40}px`,
                  "--rot": `${(i * 67) % 360}deg`,
                  "--delay": `${(i % 5) * 30}ms`,
                  background: CONFETTI[i % CONFETTI.length],
                } as React.CSSProperties
              }
            />
          );
        })}
      </div>

      <section
        aria-label="Winner"
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-amber-100 to-amber-300 px-6 pb-5 pt-5 text-center shadow-[0_18px_50px_-10px_rgba(120,53,15,0.45)] ring-1 ring-amber-900/10"
      >
        <button
          type="button"
          onClick={p.onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1 text-amber-900/50 transition-colors hover:bg-amber-900/10 hover:text-amber-900"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden>
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
          </svg>
        </button>

        {p.test ? (
          <p className="inline-block rounded-full bg-stone-800 px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-amber-50">
            {TEST_SPIN_BADGE}
          </p>
        ) : (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
            Coffee club · {p.date}
          </p>
        )}
        <div className="winner-emoji mx-auto my-3 flex h-20 items-center justify-center">
          <EmojiBadge emoji={p.emoji} name={p.name} color={p.color} size={72} />
        </div>
        <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-stone-900">
          {p.test ? `${p.name} would pick the café` : `${p.name} picks the café!`}
        </h2>
        <p className="mt-1.5 text-sm text-amber-900/80">
          {p.test
            ? `${formatPct(p.chance)} chance`
            : `Spun by ${p.spunBy} · had a ${formatPct(p.chance)} chance`}
        </p>

        {p.test ? (
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={p.onClose}
              className="flex-1 rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-stone-800 ring-1 ring-amber-900/15 transition-colors hover:bg-white"
            >
              Close
            </button>
            {p.onSpinForReal && (
              <button
                type="button"
                onClick={p.onSpinForReal}
                className="flex-1 rounded-full bg-gradient-to-b from-[#5b3a26] to-[#3a2418] px-3 py-2 text-sm font-semibold text-amber-50"
              >
                Spin for real
              </button>
            )}
          </div>
        ) : (
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={p.onPostToSlack}
            disabled={p.slackState !== "idle"}
            className="rounded-full bg-[#4a154b] px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
          >
            {p.slackState === "posting" ? "Posting…" : p.slackState === "posted" ? "Posted ✓" : "Post to Slack"}
          </button>
          {p.slackError && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {p.slackError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={p.onUndo}
              disabled={p.busy}
              className="flex-1 rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-stone-800 ring-1 ring-amber-900/15 transition-colors hover:bg-white disabled:opacity-50"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={p.onUndoAndRespin}
              disabled={p.busy}
              className="flex-1 rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-stone-800 ring-1 ring-amber-900/15 transition-colors hover:bg-white disabled:opacity-50"
            >
              Undo &amp; respin
            </button>
          </div>
          {p.error && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {p.error}
            </p>
          )}
        </div>
        )}
      </section>
    </div>
  );
}
