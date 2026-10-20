"use client";

import { useState, useTransition } from "react";
import { addAdminAction, removeAdminAction } from "@/app/actions";

const btn =
  "rounded-full px-3 py-1.5 text-sm font-medium text-stone-700 ring-1 ring-stone-300 transition-colors hover:bg-stone-900/5 disabled:opacity-50";

export function AdminAdmins({ emails }: { emails: string[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  function perform(fn: () => Promise<{ ok: true } | { error: string }>, onOk?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if ("error" in res) setError(res.error);
      else onOk?.();
    });
  }

  return (
    <section aria-labelledby="admins-h" className="flex flex-col gap-3">
      <h2 id="admins-h" className="text-lg font-bold text-stone-900">
        Admins
      </h2>
      <ul className="flex flex-col gap-2">
        {emails.map((e) => (
          <li key={e} className="flex items-center gap-3 rounded-2xl bg-white/80 px-4 py-2 shadow-sm ring-1 ring-stone-200">
            <span className="min-w-0 flex-1 truncate text-stone-800">{e}</span>
            <button
              type="button"
              className={`${btn} text-red-700`}
              disabled={pending}
              aria-label={`Remove admin ${e}`}
              onClick={() => perform(() => removeAdminAction(e))}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(ev) => {
          ev.preventDefault();
          perform(() => addAdminAction(email), () => setEmail(""));
        }}
      >
        <label className="min-w-56 flex-1 text-sm text-stone-600">
          Add admin
          <input
            className="w-full rounded-xl bg-white px-3 py-1.5 text-sm text-stone-900 ring-1 ring-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-900"
            type="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="name@visibuild.com"
            required
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-stone-900 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-stone-700 disabled:opacity-50"
        >
          Add admin
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
