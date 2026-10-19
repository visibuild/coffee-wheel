import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { admins, people, type Person } from "@/db/schema";

export type Actor = { email: string; isAdmin: boolean; person: Person | null };

export function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function loadActor(db: Db, rawEmail: string): Promise<Actor> {
  const email = normEmail(rawEmail);
  const [admin] = await db.select().from(admins).where(eq(admins.email, email));
  const [person] = await db
    .select()
    .from(people)
    .where(and(eq(people.email, email), eq(people.active, true)));
  return { email, isAdmin: !!admin, person: person ?? null };
}
