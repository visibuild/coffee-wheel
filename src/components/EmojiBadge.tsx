import type { Emoji } from "@/db/schema";
import { initials } from "@/lib/display";

type BadgeProps = { emoji: Emoji | null; name: string; color: string; size: number };

/** HTML badge: native emoji, Slack image (GIFs animate) or initials on the person's colour. */
export function EmojiBadge({ emoji, name, color, size }: BadgeProps) {
  const box = { width: size, height: size };
  if (emoji?.kind === "native") {
    return (
      <span
        aria-hidden
        className="inline-flex shrink-0 items-center justify-center leading-none"
        style={{ ...box, fontSize: size * 0.85 }}
      >
        {emoji.value}
      </span>
    );
  }
  if (emoji?.kind === "slack") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Slack CDN GIFs must stay animated
      <img src={emoji.url} alt={`:${emoji.name}:`} className="inline-block shrink-0 object-contain" style={box} />
    );
  }
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ ...box, background: color, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </span>
  );
}

/** SVG badge centred on (0, 0), for slices: a white token holding the emoji or initials. */
export function SvgEmojiBadge({ emoji, name, color, size }: BadgeProps) {
  const r = size / 2;
  return (
    <g>
      <circle r={r} fill="#fff" fillOpacity={0.94} filter="url(#badge-shadow)" />
      {emoji?.kind === "native" && (
        <text textAnchor="middle" dominantBaseline="central" fontSize={size * 0.62} y={size * 0.03}>
          {emoji.value}
        </text>
      )}
      {emoji?.kind === "slack" && (
        <image
          href={emoji.url}
          x={-r * 0.72}
          y={-r * 0.72}
          width={size * 0.72}
          height={size * 0.72}
          preserveAspectRatio="xMidYMid meet"
        />
      )}
      {!emoji && (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.4}
          fontWeight={800}
          fill={color}
        >
          {initials(name)}
        </text>
      )}
    </g>
  );
}
