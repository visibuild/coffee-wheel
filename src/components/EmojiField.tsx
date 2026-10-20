"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
// Type-only: a runtime import would pull the whole picker into the eager bundle.
import type { CategoryConfig } from "emoji-picker-react";
import type { EmojiInput } from "@/server/people";

const Picker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => <div className="h-[420px] animate-pulse rounded-2xl bg-stone-200/70" />,
});

export type SlackEmoji = { name: string; url: string };

const SLACK_GROUP = "slack";

// Plain strings equal to the package's `Categories` enum values (see its exposedTypes.d.ts).
const categories = [
  { category: "custom", group: SLACK_GROUP, name: "Visibuild Slack" },
  { category: "suggested", name: "Recently used" },
  { category: "smileys_people", name: "Smileys & People" },
  { category: "animals_nature", name: "Animals & Nature" },
  { category: "food_drink", name: "Food & Drink" },
  { category: "travel_places", name: "Travel & Places" },
  { category: "activities", name: "Activities" },
  { category: "objects", name: "Objects" },
  { category: "symbols", name: "Symbols" },
  { category: "flags", name: "Flags" },
] as unknown as CategoryConfig[];

type Props = {
  slackEmojis: SlackEmoji[];
  /** Fired with what the person picked; `null` is not used here (see "Use initials" in the form). */
  onPick: (emoji: EmojiInput) => void;
};

/** Emoji picker (native emojis plus the workspace's custom Slack emojis), loaded on demand. */
export function EmojiField({ slackEmojis, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const customEmojis = useMemo(
    () =>
      slackEmojis.map((e) => ({ id: e.name, names: [e.name], imgUrl: e.url, group: SLACK_GROUP })),
    [slackEmojis],
  );

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        className="self-start rounded-full px-3 py-1.5 text-sm font-medium text-stone-700 ring-1 ring-stone-300 transition-colors hover:bg-stone-900/5"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Hide emoji picker" : "Choose emoji"}
      </button>
      {open && (
        <Picker
          width="100%"
          lazyLoadEmojis
          categories={categories}
          customEmojis={customEmojis}
          onEmojiClick={(d) => {
            if (d.isCustom) onPick({ kind: "slack", name: d.names[0] });
            else onPick({ kind: "native", value: d.emoji });
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
