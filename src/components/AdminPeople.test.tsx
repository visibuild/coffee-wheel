import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WheelPerson } from "@/server/wheel";
import { AdminPeople } from "./AdminPeople";

const actions = vi.hoisted(() => ({
  addPersonAction: vi.fn(),
  removePersonAction: vi.fn(),
  updatePersonAction: vi.fn(),
  setShareAction: vi.fn(),
  resetStyleAction: vi.fn(),
}));
vi.mock("@/app/actions", () => actions);

const person = (id: number, name: string, share: number): WheelPerson => ({
  id,
  name,
  email: `${name.toLowerCase()}@visibuild.com`,
  share,
  color: null,
  emoji: null,
});

const people = [person(1, "Alex", 0.2), person(2, "Kai", 0.5), person(3, "Priya", 0.3)];

afterEach(() => {
  cleanup();
  Object.values(actions).forEach((m) => m.mockReset());
});

describe("AdminPeople", () => {
  it("previews everyone's resulting share while typing", () => {
    render(<AdminPeople people={people} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit share for Priya" }));
    fireEvent.change(screen.getByLabelText("Share for Priya (%)"), { target: { value: "50" } });

    const preview = screen.getByRole("table", { name: "Preview" });
    const row = (name: string) => within(preview).getByText(name).closest("tr")!;
    expect(within(row("Priya")).getByText("50.0%")).toBeTruthy();
    // Alex 0.2 and Kai 0.5 share the remaining 50% proportionally.
    expect(within(row("Alex")).getByText("14.3%")).toBeTruthy();
    expect(within(row("Kai")).getByText("35.7%")).toBeTruthy();
    expect(within(preview).getByText("100.0%")).toBeTruthy();
  });

  it("rejects out-of-range shares without calling the server", () => {
    render(<AdminPeople people={people} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit share for Priya" }));
    fireEvent.change(screen.getByLabelText("Share for Priya (%)"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert").textContent).toMatch(/between 0 and 100/);
    expect(actions.setShareAction).not.toHaveBeenCalled();
  });

  it("shows service errors inline", async () => {
    actions.setShareAction.mockResolvedValue({ error: "Admins only" });
    render(<AdminPeople people={people} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit share for Priya" }));
    fireEvent.change(screen.getByLabelText("Share for Priya (%)"), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Admins only");
    expect(actions.setShareAction).toHaveBeenCalledWith(3, 40);
  });

  it("asks for confirmation before removing", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<AdminPeople people={people} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove Kai" }));
    expect(confirm).toHaveBeenCalledWith("Remove Kai from the wheel? Their history is kept.");
    expect(actions.removePersonAction).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});
