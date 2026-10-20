"use client";

import { useState, useTransition } from "react";
import {
  addPersonAction,
  removePersonAction,
  resetStyleAction,
  setShareAction,
  updatePersonAction,
} from "@/app/actions";
import { defaultColor, formatPct } from "@/lib/display";
import { setShare } from "@/lib/weights";
import type { WheelPerson } from "@/server/wheel";
import { EmojiBadge } from "./EmojiBadge";

type Result = { ok: true } | { error: string };

const btn =
  "rounded-full px-3 py-1.5 text-sm font-medium text-stone-700 ring-1 ring-stone-300 transition-colors hover:bg-stone-900/5 disabled:opacity-50";
const primaryBtn =
  "rounded-full bg-stone-900 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:opacity-50";
const input =
  "w-full rounded-xl bg-white px-3 py-1.5 text-sm text-stone-900 ring-1 ring-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900";

/** Parses a percent input; returns the fraction, or an error message. */
function parsePct(raw: string, count: number): { share: number } | { error: string } {
  const pct = Number(raw);
  if (raw.trim() === "" || !Number.isFinite(pct)) return { error: "Enter a number" };
  if (count > 1 && !(pct > 0 && pct < 100)) return { error: "Share must be between 0 and 100" };
  return { share: pct / 100 };
}

export function AdminPeople({ people }: { people: WheelPerson[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingShare, setEditingShare] = useState<number | null>(null);
  const [shareText, setShareText] = useState("");
  const [editingInfo, setEditingInfo] = useState<number | null>(null);
  const [infoName, setInfoName] = useState("");
  const [infoEmail, setInfoEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  /** Runs an action, shows any service error inline, and calls onOk on success. */
  function perform(fn: () => Promise<Result>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if ("error" in res) setError(res.error);
      else onOk?.();
    });
  }

  const entries = people.map((p) => ({ id: p.id, weight: p.share }));
  let preview: Map<number, number> | null = null;
  let shareError: string | null = null;
  if (editingShare !== null) {
    const parsed = parsePct(shareText, people.length);
    if ("error" in parsed) shareError = shareText === "" ? null : parsed.error;
    else preview = new Map(setShare(entries, editingShare, parsed.share).map((e) => [e.id, e.weight]));
  }

  function startShareEdit(p: WheelPerson) {
    setError(null);
    setEditingShare(p.id);
    setShareText((p.share * 100).toFixed(1));
  }

  function saveShare() {
    if (editingShare === null) return;
    const parsed = parsePct(shareText, people.length);
    if ("error" in parsed) return setError(parsed.error);
    perform(
      () => setShareAction(editingShare, Number(shareText)),
      () => setEditingShare(null),
    );
  }

  function remove(p: WheelPerson) {
    if (!window.confirm(`Remove ${p.name} from the wheel? Their history is kept.`)) return;
    perform(() => removePersonAction(p.id));
  }

  function saveInfo() {
    if (editingInfo === null) return;
    perform(
      () => updatePersonAction(editingInfo, { name: infoName, email: infoEmail }),
      () => setEditingInfo(null),
    );
  }

  const editingPerson = people.find((p) => p.id === editingShare);

  return (
    <section aria-labelledby="people-h" className="flex flex-col gap-4">
      <h2 id="people-h" className="text-lg font-bold text-stone-900">
        People on the wheel
      </h2>
      <ul className="flex flex-col gap-2">
        {people.map((p) => (
          <li key={p.id} className="rounded-2xl bg-white/80 px-4 py-3 shadow-sm ring-1 ring-stone-200">
            <div className="flex flex-wrap items-center gap-3">
              <EmojiBadge emoji={p.emoji} name={p.name} color={p.color ?? defaultColor(p.id)} size={36} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-stone-900">{p.name}</div>
                <div className="truncate text-sm text-stone-500">{p.email}</div>
              </div>
              <span className="w-14 text-right font-semibold tabular-nums text-stone-800">
                {formatPct(p.share)}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" className={btn} aria-label={`Edit share for ${p.name}`} onClick={() => startShareEdit(p)}>
                  Share
                </button>
                <button
                  type="button"
                  className={btn}
                  aria-label={`Edit details for ${p.name}`}
                  onClick={() => {
                    setError(null);
                    setEditingInfo(p.id);
                    setInfoName(p.name);
                    setInfoEmail(p.email);
                  }}
                >
                  Edit
                </button>
                <button type="button" className={btn} disabled={pending} aria-label={`Reset emoji for ${p.name}`} onClick={() => perform(() => resetStyleAction(p.id, { emoji: true }))}>
                  Reset emoji
                </button>
                <button type="button" className={btn} disabled={pending} aria-label={`Reset colour for ${p.name}`} onClick={() => perform(() => resetStyleAction(p.id, { color: true }))}>
                  Reset colour
                </button>
                <button type="button" className={`${btn} text-red-700`} disabled={pending} aria-label={`Remove ${p.name}`} onClick={() => remove(p)}>
                  Remove
                </button>
              </div>
            </div>
            {editingInfo === p.id && (
              <form
                className="mt-3 flex flex-wrap items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveInfo();
                }}
              >
                <label className="min-w-40 flex-1 text-sm text-stone-600">
                  Name
                  <input className={input} value={infoName} onChange={(e) => setInfoName(e.target.value)} />
                </label>
                <label className="min-w-56 flex-1 text-sm text-stone-600">
                  Email
                  <input className={input} value={infoEmail} onChange={(e) => setInfoEmail(e.target.value)} />
                </label>
                <button type="submit" className={primaryBtn} disabled={pending}>
                  Save details
                </button>
                <button type="button" className={btn} onClick={() => setEditingInfo(null)}>
                  Cancel
                </button>
              </form>
            )}
          </li>
        ))}
        {people.length === 0 && <li className="py-6 text-center text-stone-500">No one on the wheel yet</li>}
      </ul>

      {editingPerson && (
        <div className="rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-stone-200">
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveShare();
            }}
          >
            <label className="text-sm text-stone-600">
              <span className="sr-only">Share for {editingPerson.name} (%)</span>
              <span aria-hidden>{editingPerson.name}&apos;s share (%)</span>
              <input
                aria-label={`Share for ${editingPerson.name} (%)`}
                className={`${input} w-28`}
                inputMode="decimal"
                value={shareText}
                onChange={(e) => setShareText(e.target.value)}
              />
            </label>
            <button type="submit" className={primaryBtn} disabled={pending || !preview}>
              Save
            </button>
            <button type="button" className={btn} onClick={() => setEditingShare(null)}>
              Cancel
            </button>
          </form>
          {shareError && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {shareError}
            </p>
          )}
          {preview && (
            <table aria-label="Preview" className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-stone-500">
                  <th className="font-medium">Person</th>
                  <th className="text-right font-medium">Now</th>
                  <th className="text-right font-medium">After</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id} className={p.id === editingShare ? "font-semibold" : ""}>
                    <td className="py-0.5">{p.name}</td>
                    <td className="text-right tabular-nums text-stone-500">{formatPct(p.share)}</td>
                    <td className="text-right tabular-nums">{formatPct(preview.get(p.id) ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-stone-200 text-stone-500">
                  <td className="pt-1">Total</td>
                  <td />
                  <td className="pt-1 text-right tabular-nums">
                    {formatPct([...preview.values()].reduce((s, w) => s + w, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      <form
        className="flex flex-wrap items-end gap-2 rounded-2xl bg-white/60 p-4 ring-1 ring-stone-200"
        onSubmit={(e) => {
          e.preventDefault();
          perform(
            () => addPersonAction({ name: newName, email: newEmail }),
            () => {
              setNewName("");
              setNewEmail("");
            },
          );
        }}
      >
        <label className="min-w-40 flex-1 text-sm text-stone-600">
          Name
          <input className={input} value={newName} onChange={(e) => setNewName(e.target.value)} required />
        </label>
        <label className="min-w-56 flex-1 text-sm text-stone-600">
          Email
          <input className={input} type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="name@visibuild.com" required />
        </label>
        <button type="submit" className={primaryBtn} disabled={pending}>
          Add person
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
