import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NOT_ON_WHEEL } from "@/lib/copy";
import { ProfileForm } from "./ProfileForm";

const actions = vi.hoisted(() => ({ updateProfileAction: vi.fn() }));
vi.mock("@/app/actions", () => actions);

const me = { id: 3, name: "Kai Tran", color: null, emoji: null };

afterEach(() => {
  cleanup();
  actions.updateProfileAction.mockReset();
});

describe("ProfileForm", () => {
  it("shows only the non-wheel copy when the actor is not on the wheel", () => {
    render(<ProfileForm person={null} slackEmojis={[]} />);
    expect(screen.getByText(NOT_ON_WHEEL)).toBeTruthy();
    expect(screen.queryByLabelText("Colour")).toBeNull();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  });

  it("saves a chosen colour", async () => {
    actions.updateProfileAction.mockResolvedValue({ ok: true });
    render(<ProfileForm person={me} slackEmojis={[]} />);
    fireEvent.change(screen.getByLabelText("Colour"), { target: { value: "#ff0000" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(actions.updateProfileAction).toHaveBeenCalledWith({ color: "#ff0000" }));
  });

  it("saves a new name, trimmed", async () => {
    actions.updateProfileAction.mockResolvedValue({ ok: true });
    render(<ProfileForm person={me} slackEmojis={[]} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "  Kai  " } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(actions.updateProfileAction).toHaveBeenCalledWith({ name: "Kai" }));
  });

  it("disables Save when the name is blank", () => {
    render(<ProfileForm person={me} slackEmojis={[]} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "  " } });
    expect((screen.getByRole("button", { name: "Save" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("clears the emoji with 'Use initials'", async () => {
    actions.updateProfileAction.mockResolvedValue({ ok: true });
    render(
      <ProfileForm person={{ ...me, emoji: { kind: "native", value: "🐙" } }} slackEmojis={[]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Use initials" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(actions.updateProfileAction).toHaveBeenCalledWith({ emoji: null }));
  });

  it("shows a server error", async () => {
    actions.updateProfileAction.mockResolvedValue({ error: "Colour must look like #aabbcc" });
    render(<ProfileForm person={me} slackEmojis={[]} />);
    fireEvent.change(screen.getByLabelText("Colour"), { target: { value: "#00ff00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Colour must look like");
  });
});
