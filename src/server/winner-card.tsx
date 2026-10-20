import { ImageResponse } from "next/og";
import type { Emoji } from "@/db/schema";
import { formatDate, formatPct, initials } from "@/lib/display";

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

function Badge({ emoji, winnerName, color }: Pick<WinnerCardData, "emoji" | "winnerName" | "color">) {
  if (emoji?.kind === "native") {
    return <div style={{ display: "flex", fontSize: BADGE * 0.85, lineHeight: 1 }}>{emoji.value}</div>;
  }
  if (emoji?.kind === "slack") {
    // eslint-disable-next-line @next/next/no-img-element -- rendered by satori, not the browser
    return <img src={emoji.url} alt="" width={BADGE} height={BADGE} style={{ objectFit: "contain" }} />;
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

/** The winner card as a PNG, with the same copy as the on-screen WinnerCard. */
export async function renderWinnerCardPng(card: WinnerCardData): Promise<Buffer> {
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
          <Badge emoji={card.emoji} winnerName={card.winnerName} color={card.color} />
        </div>
        <div style={{ display: "flex", fontSize: 54, fontWeight: 800, color: "#1c1917" }}>
          {`${card.winnerName} picks the café!`}
        </div>
        <div style={{ display: "flex", marginTop: 12, fontSize: 26, color: "rgba(120,53,15,0.8)" }}>
          {`Spun by ${card.spinnerName} · had a ${formatPct(card.chance)} chance`}
        </div>
      </div>
    ),
    { width: W, height: H, emoji: "twemoji" },
  );
  return Buffer.from(await res.arrayBuffer());
}
