import { Suspense } from "react";
import { getActorOrRedirect } from "@/auth";
import { ProfileForm } from "@/components/ProfileForm";
import { TopBar } from "@/components/TopBar";
import { getDb } from "@/db/client";
import { listSlackEmojis } from "@/server/people";

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <Profile />
    </Suspense>
  );
}

async function Profile() {
  const actor = await getActorOrRedirect();
  const slackEmojis = await listSlackEmojis(await getDb());
  const { person } = actor;
  return (
    <>
      <TopBar actor={actor} />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 pb-16 pt-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">Your profile</h1>
        <ProfileForm
          person={person && { id: person.id, name: person.name, color: person.color, emoji: person.emoji }}
          slackEmojis={slackEmojis}
        />
      </main>
    </>
  );
}

function ProfileSkeleton() {
  return (
    <>
      <div className="h-[57px] border-b border-stone-900/5" />
      <main className="mx-auto w-full max-w-xl px-4 pt-8" aria-busy>
        <div className="h-64 animate-pulse rounded-2xl bg-stone-200/70" />
      </main>
    </>
  );
}
