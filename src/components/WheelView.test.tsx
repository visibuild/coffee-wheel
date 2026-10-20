import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WheelPerson } from "@/server/wheel";
import { NOT_ON_WHEEL, TEST_SPIN_BADGE } from "@/lib/copy";
import { WheelView } from "./WheelView";

const { spinAction, postToSlackAction } = vi.hoisted(() => ({
  spinAction: vi.fn(),
  postToSlackAction: vi.fn(),
}));
vi.mock("@/app/actions", () => ({
  spinAction,
  postToSlackAction,
  undoAction: vi.fn(),
  undoAndRespinAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));


const person = (id: number, name: string, share: number): WheelPerson => ({
  id,
  name,
  email: `${name.toLowerCase()}@visibuild.com`,
  share,
  color: null,
  emoji: null,
});

const people = [
  person(1, "Alex", 0.125),
  person(2, "Kai", 0.5),
  person(3, "Priya", 0.375),
];

afterEach(() => {
  cleanup();
  spinAction.mockReset();
});

describe("WheelView", () => {
  it("shows the not-on-wheel copy instead of Spin for non-wheel users", () => {
    render(<WheelView people={people} canSpin={false} actorName="x@visibuild.com" />);
    expect(screen.getByText(NOT_ON_WHEEL)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Spin" })).toBeNull();
  });

  it("shows Test spin (but not Spin) to non-wheel users", () => {
    render(<WheelView people={people} canSpin={false} actorName="x@visibuild.com" />);
    expect(screen.getByRole("button", { name: "Test spin" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Spin" })).toBeNull();
  });

  it("test spin is client-only, disables both buttons, and lands with a test card", () => {
    vi.useFakeTimers();
    try {
      render(<WheelView people={people} canSpin actorName="Dave" />);
      fireEvent.click(screen.getByRole("button", { name: "Test spin" }));
      expect(spinAction).not.toHaveBeenCalled();
      expect((screen.getByRole("button", { name: "Spin" }) as HTMLButtonElement).disabled).toBe(true);
      expect((screen.getByRole("button", { name: /Spinning/ }) as HTMLButtonElement).disabled).toBe(true);

      act(() => {
        vi.advanceTimersByTime(5500); // backstop lands it
      });
      expect(screen.getByText(TEST_SPIN_BADGE)).toBeTruthy();
      expect(screen.getByRole("heading").textContent).toMatch(/would pick the café$/);
      expect(screen.getByText(/% chance$/).textContent).not.toContain("Spun by");
      expect(screen.queryByRole("button", { name: /Post to Slack/ })).toBeNull();
      expect(screen.queryByRole("button", { name: /Undo/ })).toBeNull();
      expect(screen.getByRole("button", { name: "Spin for real" })).toBeTruthy();
      expect(spinAction).not.toHaveBeenCalled();
      expect(postToSlackAction).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("offers no Spin for real to non-wheel users after a test spin", () => {
    vi.useFakeTimers();
    try {
      render(<WheelView people={people} canSpin={false} actorName="x@visibuild.com" />);
      fireEvent.click(screen.getByRole("button", { name: "Test spin" }));
      act(() => {
        vi.advanceTimersByTime(5500);
      });
      expect(screen.getByText(TEST_SPIN_BADGE)).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Spin for real" })).toBeNull();
      expect(screen.getAllByRole("button", { name: "Close" }).length).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows an empty state when no one is on the wheel", () => {
    render(<WheelView people={[]} canSpin actorName="Dave" />);
    expect(screen.getByText("No one on the wheel yet")).toBeTruthy();
  });

  it("disables Spin while the request is in flight", () => {
    spinAction.mockReturnValue(new Promise(() => {}));
    render(<WheelView people={people} canSpin actorName="Dave" />);
    const button = screen.getByRole("button", { name: "Spin" }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    fireEvent.click(button);
    expect(spinAction).toHaveBeenCalledTimes(1);
    expect(button.disabled).toBe(true);
  });

  it("lists everyone's odds sorted highest first, without half markers", () => {
    const { container } = render(<WheelView people={people} canSpin actorName="Dave" />);
    const list = screen.getByRole("list", { name: "Everyone's odds" });
    const rows = within(list).getAllByRole("listitem").map((li) => li.textContent);
    expect(rows).toEqual([
      expect.stringMatching(/Kai.*50\.0%/),
      expect.stringMatching(/Priya.*37\.5%/),
      expect.stringMatching(/Alex.*12\.5%/),
    ]);
    expect(container.textContent).not.toContain("½");
  });
});
