"use client";

import { NOT_ON_WHEEL, TEST_SPIN_LABEL } from "@/lib/copy";
import { defaultColor, formatDate } from "@/lib/display";
import type { WheelPerson } from "@/server/wheel";
import { OddsFoldout } from "./OddsFoldout";
import { useSpin } from "./useSpin";
import { Wheel } from "./Wheel";
import { WinnerCard } from "./WinnerCard";

type Props = { people: WheelPerson[]; canSpin: boolean; actorName: string };

export function WheelView({ people, canSpin, actorName }: Props) {
  const s = useSpin();
  const shown = s.frozen ?? people;
  const winner = s.result?.people.find((p) => p.id === s.result?.winnerId);
  const disabled = s.busy || s.phase === "spinning";
  const landed = s.phase === "result" && s.result && winner;

  if (shown.length === 0) {
    return (
      <div className="flex aspect-square w-[min(640px,calc(100vw-32px))] items-center justify-center rounded-full border-4 border-dashed border-stone-300 bg-white/50 p-10 text-center">
        <p className="text-lg font-medium text-stone-500">No one on the wheel yet</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="relative flex flex-col items-center gap-6">
        <Wheel
          people={shown}
          rotation={s.rotation}
          spinMs={s.spinMs}
          highlightId={landed ? winner.id : null}
          onSpinEnd={s.onSpinEnd}
        />
        {landed && (
          <div className="md:absolute md:left-1/2 md:top-[60%] md:-translate-x-1/2 md:-translate-y-1/2">
            <WinnerCard
              name={winner.name}
              emoji={winner.emoji}
              color={winner.color ?? defaultColor(winner.id)}
              chance={s.result!.chance}
              spunBy={actorName}
              test={s.result!.test}
              onSpinForReal={
                canSpin
                  ? () => {
                      s.dismiss();
                      s.spin();
                    }
                  : undefined
              }
              date={formatDate(s.result!.at)}
              busy={s.busy}
              error={s.error}
              slackState={s.slackState}
              slackError={s.slackError}
              onPostToSlack={s.postToSlack}
              onUndo={s.undo}
              onUndoAndRespin={s.undoAndRespin}
              onClose={s.dismiss}
            />
          </div>
        )}
      </div>

      {s.phase !== "result" && (
        <div className="flex flex-col items-center gap-3">
          {!canSpin && (
            <p className="max-w-sm rounded-2xl bg-white/70 px-5 py-3 text-center text-sm text-stone-600 ring-1 ring-stone-200">
              {NOT_ON_WHEEL}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {canSpin && (
              <button
                type="button"
                onClick={s.spin}
                disabled={disabled}
                className="spin-button rounded-full bg-gradient-to-b from-[#5b3a26] to-[#3a2418] px-14 py-4 text-xl font-extrabold tracking-wide text-amber-50 shadow-[0_10px_24px_-6px_rgba(58,36,24,0.6),inset_0_1px_0_rgba(255,255,255,0.15)] transition-[transform,opacity,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-6px_rgba(58,36,24,0.65),inset_0_1px_0_rgba(255,255,255,0.15)] active:translate-y-0 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {s.phase === "spinning" && !s.result?.test ? "Spinning…" : "Spin"}
              </button>
            )}
            <button
              type="button"
              onClick={() => s.testSpin(shown)}
              disabled={disabled}
              className="rounded-full bg-white/80 px-6 py-3 text-sm font-semibold text-stone-700 ring-1 ring-stone-300 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {s.phase === "spinning" && s.result?.test ? "Spinning…" : TEST_SPIN_LABEL}
            </button>
          </div>
          {s.error && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {s.error}
            </p>
          )}
        </div>
      )}

      <OddsFoldout people={shown} />
    </div>
  );
}
