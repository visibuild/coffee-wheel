import NextAuth from "next-auth";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { loadActor, type Actor } from "@/server/actor";
import authConfig from "./auth.config";

export { isAllowedEmail } from "./auth.config";

export const { auth, signIn, signOut, handlers } = NextAuth(authConfig);

/** For server components and actions: the signed-in actor, or redirect to /signin. */
export async function getActorOrRedirect(): Promise<Actor> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/signin");
  return loadActor(await getDb(), email);
}
