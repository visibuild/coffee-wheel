import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WheelPerson } from "@/server/wheel";
import { NOT_ON_WHEEL } from "@/lib/copy";
import { WheelView } from "./WheelView";

const { spinAction } = vi.hoisted(() => ({ spinAction: vi.fn() }));
vi.mock("@/app/actions", () => ({
  spinAction,
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
