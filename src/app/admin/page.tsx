import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getActorOrRedirect } from "@/auth";
import { AdminAdmins } from "@/components/AdminAdmins";
import { AdminPeople } from "@/components/AdminPeople";
import { TopBar } from "@/components/TopBar";
import { getDb } from "@/db/client";
import { listAdmins } from "@/server/admins";
import { getWheelState } from "@/server/wheel";

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Admin />
    </Suspense>
  );
}

async function Admin() {
  const actor = await getActorOrRedirect();
  if (!actor.isAdmin) redirect("/");
  const db = await getDb();
  const [{ people }, admins] = await Promise.all([getWheelState(db), listAdmins(db)]);
  return (
    <>
      <TopBar actor={actor} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 pb-16 pt-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">Admin</h1>
        <AdminPeople people={people} />
        <AdminAdmins emails={admins.map((a) => a.email)} />
      </main>
    </>
  );
}

function AdminSkeleton() {
  return (
    <>
      <div className="h-[57px] border-b border-stone-900/5" />
      <main className="mx-auto w-full max-w-3xl px-4 pt-8" aria-busy>
        <div className="h-64 animate-pulse rounded-2xl bg-stone-200/70" />
      </main>
    </>
  );
}
