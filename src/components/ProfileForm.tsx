"use client";

import { useState, useTransition } from "react";
import { updateProfileAction } from "@/app/actions";
import { NOT_ON_WHEEL } from "@/lib/copy";
import { defaultColor } from "@/lib/display";
import { slicePath } from "@/lib/wheel-geometry";
import type { Emoji } from "@/db/schema";
import type { EmojiInput } from "@/server/people";
import { EmojiField, type SlackEmoji } from "./EmojiField";
import { EmojiBadge, SvgEmojiBadge } from "./EmojiBadge";

type Me = { id: number; name: string; color: string | null; emoji: Emoji | null };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function ProfileForm({ person, slackEmojis }: { person: Me | null; slackEmojis: SlackEmoji[] }) {
  if (!person) {
    return <p className="rounded-2xl bg-white/80 p-4 text-stone-700 shadow-sm ring-1 ring-stone-200">{NOT_ON_WHEEL}</p>;
  }
  return <Editor person={person} slackEmojis={slackEmojis} />;
}

function Editor({ person, slackEmojis }: { person: Me; slackEmojis: SlackEmoji[] }) {
  const initialColor = person.color ?? defaultColor(person.id);
  const [name, setName] = useState(person.name);
  const [color, setColor] = useState(initialColor);
  const [emoji, setEmoji] = useState<Emoji | null>(person.emoji);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const trimmedName = name.trim();
  const nameChanged = trimmedName !== person.name;
  const colorChanged = color.toLowerCase() !== initialColor.toLowerCase();
  const emojiChanged = !same(emoji, person.emoji);

  function pick(e: EmojiInput) {
    // Slack emojis show from the cached list here; the server resolves the url on save.
    const url = e.kind === "slack" ? slackEmojis.find((s) => s.name === e.name)?.url : undefined;
    setEmoji(e.kind === "native" ? e : { kind: "slack", name: e.name, url: url ?? "" });
    setSaved(false);
  }

  function save() {
    const patch: { name?: string; color?: string; emoji?: EmojiInput | null } = {};
    if (nameChanged) patch.name = trimmedName;
    if (colorChanged) patch.color = color;
    if (emojiChanged)
      patch.emoji =
        emoji === null ? null : emoji.kind === "native" ? emoji : { kind: "slack", name: emoji.name };
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateProfileAction(patch);
      if ("error" in res) setError(res.error);
      else setSaved(true);
    });
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(ev) => {
        ev.preventDefault();
        save();
      }}
    >
      <div className="flex flex-wrap items-center gap-6 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-stone-200">
        <Preview name={trimmedName || person.name} color={color} emoji={emoji} />
        <p className="text-sm text-stone-600">This is how you appear on the wheel.</p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700">
        Name
        <input
          type="text"
          maxLength={40}
          className="h-11 max-w-xs rounded-xl bg-white px-3 text-base font-normal text-stone-900 ring-1 ring-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-500"
          value={name}
          onChange={(ev) => {
            setName(ev.target.value);
            setSaved(false);
          }}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700">
        Colour
        <input
          type="color"
          className="h-11 w-24 cursor-pointer rounded-xl bg-white p-1 ring-1 ring-stone-300"
          value={color}
          onChange={(ev) => {
            setColor(ev.target.value);
            setSaved(false);
          }}
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-stone-700">Emoji</span>
        <div className="flex items-center gap-3">
          <EmojiBadge emoji={emoji} name={trimmedName || person.name} color={color} size={36} />
          <button
            type="button"
            disabled={emoji === null}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-stone-700 ring-1 ring-stone-300 transition-colors hover:bg-stone-900/5 disabled:opacity-50"
            onClick={() => {
              setEmoji(null);
              setSaved(false);
            }}
          >
            Use initials
          </button>
        </div>
        <EmojiField slackEmojis={slackEmojis} onPick={pick} />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || !trimmedName || (!nameChanged && !colorChanged && !emojiChanged)}
          className="rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:opacity-50"
        >
          Save
        </button>
        {saved && <span role="status" className="text-sm text-emerald-700">Saved</span>}
        {error && (
          <span role="alert" className="text-sm text-red-700">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}

const W = 160;

/** A single wedge of the wheel with the person's badge on it. */
function Preview({ name, color, emoji }: { name: string; color: string; emoji: Emoji | null }) {
  const cx = W / 2;
  const r = 72;
  return (
    <svg viewBox={`0 0 ${W} ${W}`} width={W} height={W} role="img" aria-label="Preview of your slice">
      <defs>
        <filter id="badge-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.25" />
        </filter>
      </defs>
      <circle cx={cx} cy={cx} r={r} fill="#fffaf3" stroke="#e7e5e4" />
      <path d={slicePath(cx, cx, r, -60, 60)} fill={color} stroke="#fff" strokeWidth={2} strokeLinejoin="round" />
      <g transform={`translate(${cx} ${cx - r * 0.62})`}>
        <SvgEmojiBadge emoji={emoji} name={name} color={color} size={36} />
      </g>
    </svg>
  );
}
