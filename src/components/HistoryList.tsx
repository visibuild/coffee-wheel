"use client";

import { useState, useTransition } from "react";
import { undoAction } from "@/app/actions";
import { defaultColor, formatDate, formatPct, formatTime } from "@/lib/display";
import type { TimelineItem } from "@/lib/timeline";
import { EmojiBadge } from "./EmojiBadge";

type SpinItem = Extract<TimelineItem, { kind: "spin" }>;

export function HistoryList({ items }: { items: TimelineItem[] }) {
  if (items.length === 0)
    return <p className="py-12 text-center text-stone-500">No spins yet. Go spin the wheel!</p>;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) =>
        item.kind === "spin" ? (
          <SpinRowView key={`s${item.spin.id}`} item={item} />
        ) : (
          <li
            key={`w${item.change.id}`}
            className="rounded-2xl px-4 py-2 text-sm text-stone-500"
          >
            {item.change.changedByName} set {item.change.person.name} to{" "}
            {formatPct(item.change.newShare)}
            <span className="ml-2 text-stone-400">
              {formatDate(item.at)} · {formatTime(item.at)}
            </span>
          </li>
        ),
      )}
    </ul>
  );
}

function SpinRowView({ item }: { item: SpinItem }) {
  const { spin } = item;
  const { winner } = spin;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const undone = !!spin.undoneAt;

  function undo() {
    setError(null);
    startTransition(async () => {
      const res = await undoAction(spin.id);
      if ("error" in res) setError(res.error);
    });
  }

  return (
    <li className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-stone-200">
      <div className="flex items-center gap-3">
        <EmojiBadge
          emoji={winner.emoji}
          name={winner.name}
          color={winner.color ?? defaultColor(winner.id)}
          size={36}
        />
        <div className={`min-w-0 flex-1 ${undone ? "text-stone-400 line-through" : ""}`}>
          <div className="truncate font-semibold text-stone-900">
            <span className={undone ? "text-stone-400" : ""}>{winner.name}</span>
            <span className="ml-2 text-sm font-medium text-stone-500">
              {formatPct(spin.chance)}
            </span>
          </div>
          <div className="truncate text-sm text-stone-500">
            spun by {spin.spunByName} · {formatDate(item.at)} · {formatTime(item.at)}
          </div>
        </div>
        {!undone && (
          <button
            type="button"
            onClick={undo}
            disabled={pending}
            className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-stone-700 ring-1 ring-stone-300 transition-colors hover:bg-stone-900/5 disabled:opacity-50"
          >
            {pending ? "Undoing…" : "Undo"}
          </button>
        )}
      </div>
      {undone && spin.undoneAt && (
        <p className="mt-1 pl-12 text-sm text-stone-500">
          undone by {spin.undoneByName} · {formatDate(spin.undoneAt)} · {formatTime(spin.undoneAt)}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-1 pl-12 text-sm text-red-600">
          {error}
        </p>
      )}
    </li>
  );
}
