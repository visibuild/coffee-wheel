import { Suspense } from "react";
import { getActorOrRedirect } from "@/auth";
import { TopBar } from "@/components/TopBar";
import { WheelView } from "@/components/WheelView";
import { getDb } from "@/db/client";
import { getWheelState } from "@/server/wheel";

export default function Home() {
  return (
    <Suspense fallback={<WheelSkeleton />}>
      <WheelPage />
    </Suspense>
  );
}

// Reads the session, so it streams in behind the Suspense boundary.
async function WheelPage() {
  const actor = await getActorOrRedirect();
  const { people } = await getWheelState(await getDb());
  return (
    <>
      <TopBar actor={actor} />
      <main className="flex flex-1 flex-col items-center overflow-x-clip px-4 pb-16 pt-10">
        <WheelView
          people={people}
          canSpin={!!actor.person}
          actorName={actor.person?.name ?? actor.email}
        />
      </main>
    </>
  );
}

function WheelSkeleton() {
  return (
    <>
      <div className="h-[57px] border-b border-stone-900/5" />
      <main className="flex flex-1 flex-col items-center px-4 pt-10" aria-busy>
        <div className="aspect-square w-[min(640px,calc(100vw-32px))] animate-pulse rounded-full bg-stone-200/70" />
        <div className="mt-6 h-[60px] w-44 animate-pulse rounded-full bg-stone-200/70" />
      </main>
    </>
  );
}
