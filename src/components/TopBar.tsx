import Link from "next/link";
import { defaultColor } from "@/lib/display";
import type { Actor } from "@/server/actor";
import { EmojiBadge } from "./EmojiBadge";

const navLink =
  "rounded-full px-2 py-1.5 font-medium sm:px-3 text-stone-600 transition-colors hover:bg-stone-900/5 hover:text-stone-900";

export function TopBar({ actor }: { actor: Actor }) {
  const { person } = actor;
  const name = person?.name ?? actor.email;
  return (
    <header className="sticky top-0 z-30 border-b border-stone-900/5 bg-[var(--background)]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="shrink-0 text-base font-extrabold sm:text-lg tracking-tight text-stone-900">
          ☕ Coffee Wheel
        </Link>
        <nav className="flex min-w-0 items-center gap-0.5 text-sm sm:gap-1">
          <Link href="/history" className={navLink}>
            History
          </Link>
          {actor.isAdmin && (
            <Link href="/admin" className={navLink}>
              Admin
            </Link>
          )}
          <Link
            href="/profile"
            title="Your profile"
            className="ml-1 flex min-w-0 items-center gap-1.5 rounded-full bg-white/80 py-1 pl-1 pr-2.5 font-medium text-stone-800 shadow-sm ring-1 ring-stone-200 transition-colors hover:bg-white"
          >
            <EmojiBadge
              emoji={person?.emoji ?? null}
              name={name}
              color={person ? (person.color ?? defaultColor(person.id)) : "#78716c"}
              size={24}
            />
            <span className="min-w-[2.5rem] max-w-[9rem] truncate sm:max-w-[14rem]">{name}</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
