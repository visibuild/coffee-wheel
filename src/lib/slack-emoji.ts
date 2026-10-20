export interface CustomEmoji {
  name: string;
  url: string;
}

const ALIAS = "alias:";

/**
 * Turns Slack's emoji.list map into name/url pairs. An `alias:target` entry takes the
 * target's url when the target is itself a custom emoji in the same response; aliases
 * to anything else (standard emoji like `wave`, or other aliases) are dropped.
 */
export function parseEmojiList(raw: Record<string, string>): CustomEmoji[] {
  const out: CustomEmoji[] = [];
  for (const [name, value] of Object.entries(raw)) {
    if (!value.startsWith(ALIAS)) {
      out.push({ name, url: value });
      continue;
    }
    const target = raw[value.slice(ALIAS.length)];
    if (target !== undefined && !target.startsWith(ALIAS)) out.push({ name, url: target });
  }
  return out;
}
