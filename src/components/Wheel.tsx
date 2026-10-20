"use client";

import { useEffect, useRef, useState } from "react";
import { defaultColor, formatPct } from "@/lib/display";
import { polar, sliceAngles, slicePath } from "@/lib/wheel-geometry";
import type { WheelPerson } from "@/server/wheel";
import { EmojiBadge, SvgEmojiBadge } from "./EmojiBadge";

export const SPIN_EASING = "cubic-bezier(0.17, 0.67, 0.12, 0.99)";

const C = 500; // viewBox centre
const R = 462; // slice radius
const BADGE_R = R * 0.8;
const BULBS = 28;

type Props = {
  people: WheelPerson[];
  rotation: number;
  spinMs: number;
  /** Dims every other slice once the wheel has landed. */
  highlightId?: number | null;
  onSpinEnd?: () => void;
};

export function Wheel({ people, rotation, spinMs, highlightId, onSpinEnd }: Props) {
  const shares = useTweenedShares(people);
  const angles = sliceAngles(shares);
  const boxRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ id: number; x: number; y: number } | null>(null);
  const [tipRotation, setTipRotation] = useState(rotation);
  if (tipRotation !== rotation) {
    // A new spin moves the slices out from under the cursor.
    setTipRotation(rotation);
    setTip(null);
  }
  const tipPerson = tip && people.find((p) => p.id === tip.id);

  function showTip(e: { clientX: number; clientY: number }, id: number) {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    setTip({ id, x: e.clientX - box.left, y: e.clientY - box.top });
  }

  return (
    <div
      ref={boxRef}
      className="relative aspect-square w-[min(640px,calc(100vw-32px))] touch-manipulation select-none"
    >
      {/* Shadow plate stays still so the rotating layer stays cheap to composite. */}
      <div className="absolute inset-[1%] rounded-full shadow-[0_24px_60px_-12px_rgba(60,30,10,0.45),0_8px_20px_-8px_rgba(60,30,10,0.35)]" />

      {/* Clips the rotated square's corners so they never widen the page. */}
      <div className="absolute inset-0 overflow-hidden rounded-full">
        <svg
          viewBox="0 0 1000 1000"
          role="img"
          aria-label="Coffee wheel"
          // Only painted slices take pointer events.
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: `transform ${spinMs}ms ${SPIN_EASING}`,
            willChange: "transform",
          }}
          onTransitionEnd={(e) => {
            if (e.target === e.currentTarget && e.propertyName === "transform") onSpinEnd?.();
          }}
          onPointerLeave={(e) => e.pointerType !== "touch" && setTip(null)}
        >
          <defs>
            <filter id="badge-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.25" />
            </filter>
            <radialGradient id="wheel-sheen" cx="50%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.22" />
              <stop offset="55%" stopColor="#fff" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.12" />
            </radialGradient>
          </defs>

          <circle cx={C} cy={C} r={498} fill="#3a2418" />
          <circle cx={C} cy={C} r={486} fill="none" stroke="#5b3a26" strokeWidth={6} />
          {Array.from({ length: BULBS }, (_, i) => {
            const p = polar(C, C, 481, (i * 360) / BULBS);
            return <circle key={i} cx={p.x} cy={p.y} r={6} fill={i % 2 ? "#fde68a" : "#fff7ed"} />;
          })}

          {/* Light base so dimmed slices fade to a pastel rather than the dark rim. */}
          <circle cx={C} cy={C} r={R} fill="#fffaf3" />
          <g>
            {people.map((p, i) => {
              const a = angles[i];
              const fill = p.color ?? defaultColor(p.id);
              const dimmed = highlightId != null && highlightId !== p.id;
              const span = a.end - a.start;
              const size = Math.min(88, R * 0.3, ((2 * Math.PI * BADGE_R * span) / 360) * 0.72);
              const show = (e: { clientX: number; clientY: number }) => showTip(e, p.id);
              return (
                <g
                  key={p.id}
                  pointerEvents="visiblePainted"
                  style={{ opacity: dimmed ? 0.45 : 1, transition: "opacity 500ms ease" }}
                  onPointerEnter={show}
                  onPointerMove={show}
                  onClick={show}
                >
                  {span >= 359.999 ? (
                    <circle cx={C} cy={C} r={R} fill={fill} />
                  ) : (
                    <path
                      d={slicePath(C, C, R, a.start, a.end)}
                      fill={fill}
                      stroke="#fff"
                      strokeWidth={3}
                      strokeLinejoin="round"
                    />
                  )}
                  {size >= 18 && (
                    <g transform={`rotate(${a.mid} ${C} ${C}) translate(${C} ${C - BADGE_R})`}>
                      <SvgEmojiBadge emoji={p.emoji} name={p.name} color={fill} size={size} />
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          <circle cx={C} cy={C} r={R} fill="url(#wheel-sheen)" pointerEvents="none" />
          <circle cx={C} cy={C} r={R} fill="none" stroke="#2a180f" strokeOpacity={0.35} strokeWidth={4} />
        </svg>
      </div>

      {/* Hub */}
      <div
        className="absolute left-1/2 top-1/2 flex aspect-square w-[15%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-b from-white to-amber-50 text-[clamp(18px,5vw,36px)] shadow-[0_4px_14px_rgba(60,30,10,0.35),inset_0_-3px_6px_rgba(120,60,20,0.12)] ring-4 ring-[#3a2418]"
        aria-hidden
        onClick={() => setTip(null)}
      >
        ☕
      </div>

      {/* Pointer */}
      <svg
        viewBox="0 0 60 72"
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 w-[9%] max-w-14 min-w-8 -translate-x-1/2 -translate-y-[38%] drop-shadow-[0_4px_6px_rgba(0,0,0,0.35)]"
      >
        <path
          d="M30 70 L6 26 A26 26 0 1 1 54 26 Z"
          fill="#1c1410"
          stroke="#fff"
          strokeWidth={4}
          strokeLinejoin="round"
        />
        <circle cx={30} cy={26} r={9} fill="#fbbf24" />
      </svg>

      {tipPerson && tip && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 flex -translate-x-1/2 -translate-y-full items-center gap-1.5 whitespace-nowrap rounded-lg bg-stone-900/95 px-2.5 py-1.5 text-sm font-medium text-white shadow-lg"
          style={{ left: tip.x, top: tip.y - 12 }}
        >
          <EmojiBadge
            emoji={tipPerson.emoji}
            name={tipPerson.name}
            color={tipPerson.color ?? defaultColor(tipPerson.id)}
            size={18}
          />
          <span>
            {tipPerson.name} · {formatPct(tipPerson.share)}
          </span>
        </div>
      )}
    </div>
  );
}

const TWEEN_MS = 700;
const ease = (t: number) => 1 - (1 - t) ** 3;
const lerp = (a: number[], b: number[], t: number) => b.map((x, i) => a[i] + (x - a[i]) * t);

/** Animates share changes (e.g. the winner's slice halving) when the same people stay on the wheel. */
function useTweenedShares(people: WheelPerson[]): number[] {
  const key = people.map((p) => p.id).join(",");
  const to = people.map((p) => p.share);
  const sig = `${key}|${to.join(",")}`;
  const [tw, setTw] = useState({ sig, key, from: to, to, t: 1 });

  if (tw.sig !== sig) {
    // Adjusting state during render (React's "storing information from previous renders" pattern).
    const sameSet = tw.key === key;
    setTw({ sig, key, from: sameSet ? lerp(tw.from, tw.to, ease(tw.t)) : to, to, t: sameSet ? 0 : 1 });
  }

  const animating = tw.t < 1;
  useEffect(() => {
    if (!animating) return;
    const start = performance.now();
    let raf = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / TWEEN_MS);
      setTw((s) => ({ ...s, t }));
      if (t < 1) raf = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [animating, tw.sig]);

  return tw.sig === sig ? lerp(tw.from, tw.to, ease(tw.t)) : to;
}
