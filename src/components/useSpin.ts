"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { postToSlackAction, spinAction, undoAction, undoAndRespinAction } from "@/app/actions";
import { pickWinner } from "@/lib/weights";
import { sliceAngles, targetRotation } from "@/lib/wheel-geometry";
import type { SpinResult, WheelPerson } from "@/server/wheel";

export type SpinPhase = "idle" | "spinning" | "result";

const SPIN_MS = 5000;
const REDUCED_SPIN_MS = 1200;
/** Pause after landing before the slices resize to the new shares. */
const SETTLE_MS = 1200;
const FAILED = "Something went wrong. Try again.";

/** A test spin is client-only: it has no spin id, is never recorded and can never be posted. */
type Landed = SpinResult & { at: Date; test: boolean };

const TEST_SPIN_ID = -1;
const cryptoRand = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

/** The spin state machine: idle → spinning → result. The server picks the winner; we animate to it. */
export function useSpin() {
  const router = useRouter();
  const [phase, setPhase] = useState<SpinPhase>("idle");
  const [busy, setBusy] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<Landed | null>(null);
  /** Pre-spin people, drawn while animating so the pointer lands on the winner's slice. */
  const [frozen, setFrozen] = useState<WheelPerson[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [spinMs, setSpinMs] = useState(SPIN_MS);
  const [slack, setSlack] = useState<{ spinId: number; state: "posting" | "posted" } | null>(null);
  const [slackError, setSlackError] = useState<string | null>(null);
  const spinToken = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  function animate(r: SpinResult, test = false) {
    clearTimers();
    const angles = sliceAngles(r.people.map((p) => p.share));
    const slice = angles[r.people.findIndex((p) => p.id === r.winnerId)];
    const jitter = (Math.random() * 2 - 1) * 0.4 * ((slice.end - slice.start) / 2);
    const token = ++spinToken.current;
    const ms = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ? REDUCED_SPIN_MS
      : SPIN_MS;
    setSpinMs(ms);
    setFrozen(r.people);
    setResult({ ...r, at: new Date(), test });
    setSlackError(null);
    setPhase("spinning");
    setRotation((current) => targetRotation(current, slice.mid, 5, jitter));
    // Backstop in case transitionend never fires (e.g. a backgrounded tab).
    timers.current.push(setTimeout(() => land(token, test), ms + 500));
  }

  function land(token: number, test: boolean) {
    if (token !== spinToken.current) return;
    spinToken.current++; // land once per spin
    setPhase("result");
    timers.current.push(
      setTimeout(() => {
        setFrozen(null);
        if (!test) router.refresh(); // a test spin changes nothing
      }, SETTLE_MS),
    );
  }

  async function call<T>(action: () => Promise<T | { error: string }>, onOk: (r: T) => void) {
    setBusy(true);
    setError(null);
    try {
      const r = await action();
      if (r && typeof r === "object" && "error" in r) setError(r.error);
      else onOk(r as T);
    } catch {
      setError(FAILED);
    } finally {
      setBusy(false);
    }
  }

  const slackState: "idle" | "posting" | "posted" =
    slack && !result?.test && slack.spinId === result?.spinId ? slack.state : "idle";

  async function postToSlack() {
    if (!result || result.test) return;
    const spinId = result.spinId;
    setSlack({ spinId, state: "posting" });
    setSlackError(null);
    try {
      const r = await postToSlackAction(spinId);
      if ("error" in r) {
        if (r.error === "Already posted") setSlack({ spinId, state: "posted" });
        else {
          setSlack(null);
          setSlackError(r.error);
        }
      } else setSlack({ spinId, state: "posted" });
    } catch {
      setSlack(null);
      setSlackError(FAILED);
    }
  }

  return {
    slackState: slackState,
    slackError,
    postToSlack,
    phase,
    busy,
    rotation,
    spinMs,
    result,
    frozen,
    error,
    spin: () => call(spinAction, animate),
    /** Picks a winner over the displayed shares; nothing is sent to the server. */
    testSpin: (people: WheelPerson[]) => {
      const winnerId = pickWinner(
        people.map((p) => ({ id: p.id, weight: p.share })),
        cryptoRand(),
      );
      const chance = people.find((p) => p.id === winnerId)!.share;
      animate({ spinId: TEST_SPIN_ID, winnerId, chance, people }, true);
    },
    undo: () =>
      result &&
      call(
        () => undoAction(result.spinId),
        () => {
          clearTimers();
          setPhase("idle");
          setResult(null);
          setFrozen(null);
          router.refresh();
        },
      ),
    undoAndRespin: () =>
      result && call(() => undoAndRespinAction(result.spinId), (r) => animate(r.result)),
    dismiss: () => {
      setPhase("idle");
      setResult(null);
      setError(null);
    },
    // Only the spin in flight can land; a late transitionend after a backstop/undo is ignored.
    onSpinEnd: () => {
      if (phase === "spinning") land(spinToken.current, result?.test ?? false);
    },
  };
}
