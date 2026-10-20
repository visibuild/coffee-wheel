import { describe, expect, it } from "vitest";
import { parseEmojiList } from "./slack-emoji";

describe("parseEmojiList", () => {
  it("resolves aliases to custom emoji and drops aliases to standard emoji", () => {
    expect(
      parseEmojiList({ party: "https://e/p.gif", yay: "alias:party", wave2: "alias:wave" }),
    ).toEqual([
      { name: "party", url: "https://e/p.gif" },
      { name: "yay", url: "https://e/p.gif" },
    ]);
  });

  it("drops alias chains and loops", () => {
    expect(parseEmojiList({ a: "alias:b", b: "alias:a", c: "alias:a" })).toEqual([]);
  });
});
