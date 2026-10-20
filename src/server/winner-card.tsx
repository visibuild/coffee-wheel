import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { Emoji } from "@/db/schema";
import { formatDate, formatPct, headingFontSize, initials } from "@/lib/display";
import { emojiDataUri } from "./emoji-image";

export type WinnerCardData = {
  date: Date;
  winnerName: string;
  emoji: Emoji | null;
  color: string;
  spinnerName: string;
  chance: number;
};

const W = 800;
const H = 450;
const BADGE = 150;

type BadgeProps = Pick<WinnerCardData, "emoji" | "winnerName" | "color"> & { slackSrc: string | null };

function Badge({ emoji, winnerName, color, slackSrc }: BadgeProps) {
  if (emoji?.kind === "native") {
    return <div style={{ display: "flex", fontSize: BADGE * 0.85, lineHeight: 1 }}>{emoji.value}</div>;
  }
  if (emoji?.kind === "slack" && slackSrc) {
    // eslint-disable-next-line @next/next/no-img-element -- rendered by satori, not the browser
    return <img src={slackSrc} alt="" width={BADGE} height={BADGE} style={{ objectFit: "contain" }} />;
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: BADGE,
        height: BADGE,
        borderRadius: BADGE,
        background: color,
        color: "#fff",
        fontSize: BADGE * 0.4,
        fontWeight: 700,
      }}
    >
      {initials(winnerName)}
    </div>
  );
}

// Read from disk (not a CDN); next.config.ts traces src/assets into the serverless bundle.
const loadFont = async (file: string) => {
  const buf = await readFile(join(process.cwd(), "src/assets", file));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
};

/** The winner card as a PNG, with the same copy as the on-screen WinnerCard. */
export async function renderWinnerCardPng(card: WinnerCardData): Promise<Buffer> {
  // Satori draws GIFs as blanks, so Slack emojis are fetched and flattened to a still PNG first;
  // on failure the badge falls back to initials.
  const [slackSrc, regular, bold, heavy] = await Promise.all([
    card.emoji?.kind === "slack" ? emojiDataUri(card.emoji.url) : null,
    loadFont("inter-400.woff"),
    loadFont("inter-700.woff"),
    loadFont("inter-800.woff"),
  ]);
  const heading = `${card.winnerName} picks the café!`;
  const res = new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter",
          background: "linear-gradient(135deg, #fffbeb, #fef3c7 50%, #fcd34d)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "#92400e",
          }}
        >
          {`Coffee club · ${formatDate(card.date)}`}
        </div>
        <div style={{ display: "flex", margin: "28px 0", height: BADGE, alignItems: "center" }}>
          <Badge emoji={card.emoji} winnerName={card.winnerName} color={card.color} slackSrc={slackSrc} />
        </div>
        <div
          style={{
            display: "flex",
            maxWidth: W - 60,
            fontSize: headingFontSize(heading),
            fontWeight: 800,
            lineClamp: 2,
            color: "#1c1917",
          }}
        >
          {heading}
        </div>
        <div style={{ display: "flex", marginTop: 12, fontSize: 26, color: "rgba(120,53,15,0.8)" }}>
          {`Spun by ${card.spinnerName} · had a ${formatPct(card.chance)} chance`}
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      emoji: "twemoji",
      fonts: [
        { name: "Inter", data: regular, weight: 400, style: "normal" },
        { name: "Inter", data: bold, weight: 700, style: "normal" },
        { name: "Inter", data: heavy, weight: 800, style: "normal" },
      ],
    },
  );
  return Buffer.from(await res.arrayBuffer());
}
