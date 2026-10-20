"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Categories, type CategoryConfig } from "emoji-picker-react";
import type { EmojiInput } from "@/server/people";

const Picker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => <div className="h-[420px] animate-pulse rounded-2xl bg-stone-200/70" />,
});

export type SlackEmoji = { name: string; url: string };

const SLACK_GROUP = "slack";

const categories: CategoryConfig[] = [
  { category: Categories.CUSTOM, group: SLACK_GROUP, name: "Visibuild Slack" } as CategoryConfig,
  { category: Categories.SUGGESTED, name: "Recently used" },
  { category: Categories.SMILEYS_PEOPLE, name: "Smileys & People" },
  { category: Categories.ANIMALS_NATURE, name: "Animals & Nature" },
  { category: Categories.FOOD_DRINK, name: "Food & Drink" },
  { category: Categories.TRAVEL_PLACES, name: "Travel & Places" },
  { category: Categories.ACTIVITIES, name: "Activities" },
  { category: Categories.OBJECTS, name: "Objects" },
  { category: Categories.SYMBOLS, name: "Symbols" },
  { category: Categories.FLAGS, name: "Flags" },
];

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
