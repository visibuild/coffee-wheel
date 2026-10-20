import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SpinResult } from "@/server/wheel";
import { useSpin } from "./useSpin";

const { spinAction, undoAction } = vi.hoisted(() => ({ spinAction: vi.fn(), undoAction: vi.fn() }));
vi.mock("@/app/actions", () => ({
  spinAction,
  undoAction,
  undoAndRespinAction: vi.fn(),
  postToSlackAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const spinResult: SpinResult = {
  spinId: 7,
  winnerId: 1,
  chance: 0.5,
  people: [
    { id: 1, name: "Alex", email: "a@visibuild.com", share: 0.5, color: null, emoji: null },
    { id: 2, name: "Kai", email: "k@visibuild.com", share: 0.5, color: null, emoji: null },
  ],
} as SpinResult;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useSpin", () => {
  it("ignores a late transitionend after the backstop landed and the spin was undone", async () => {
    spinAction.mockResolvedValue(spinResult);
    undoAction.mockResolvedValue({ ok: true });
    const { result } = renderHook(() => useSpin());

    await act(async () => {
      await result.current.spin();
    });
    expect(result.current.phase).toBe("spinning");

    act(() => {
      vi.advanceTimersByTime(5500); // backstop lands it
    });
    expect(result.current.phase).toBe("result");

    await act(async () => {
      await result.current.undo();
    });
    expect(result.current.phase).toBe("idle");

    act(() => result.current.onSpinEnd()); // late transitionend
    expect(result.current.phase).toBe("idle");
    expect(result.current.result).toBeNull();
  });

  it("lands once on transitionend, and the backstop does not land again", async () => {
    spinAction.mockResolvedValue(spinResult);
    const { result } = renderHook(() => useSpin());
    await act(async () => {
      await result.current.spin();
    });
    act(() => result.current.onSpinEnd());
    expect(result.current.phase).toBe("result");
    act(() => result.current.dismiss());
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(result.current.phase).toBe("idle");
  });
});
