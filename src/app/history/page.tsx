import { Suspense } from "react";
import { getActorOrRedirect } from "@/auth";
import { HistoryList } from "@/components/HistoryList";
import { TopBar } from "@/components/TopBar";
import { getDb } from "@/db/client";
import { buildTimeline } from "@/lib/timeline";
import { listHistory } from "@/server/wheel";

export default function HistoryPage() {
  return (
    <Suspense fallback={<HistorySkeleton />}>
      <History />
    </Suspense>
  );
}

async function History() {
  const actor = await getActorOrRedirect();
  const { spins, weightChanges } = await listHistory(await getDb());
  return (
    <>
      <TopBar actor={actor} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-8">
        <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-stone-900">History</h1>
        <HistoryList items={buildTimeline(spins, weightChanges)} />
      </main>
    </>
  );
}

function HistorySkeleton() {
  return (
    <>
      <div className="h-[57px] border-b border-stone-900/5" />
      <main className="mx-auto w-full max-w-2xl px-4 pt-8" aria-busy>
        <div className="h-64 animate-pulse rounded-2xl bg-stone-200/70" />
      </main>
    </>
  );
}
