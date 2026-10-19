import { asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { admins } from "@/db/schema";
import { loadActor, normEmail, type Actor } from "./actor";
import { AppError } from "./errors";

export const COMPANY_DOMAIN = "@visibuild.com";

/** Normalises and checks that an email belongs to the company domain. */
export function companyEmail(raw: string): string {
  const email = normEmail(raw);
  if (!email.endsWith(COMPANY_DOMAIN) || email.length === COMPANY_DOMAIN.length)
    throw new AppError("INVALID", `Email must end in ${COMPANY_DOMAIN}`);
  return email;
}

/** Loads the actor inside the caller's transaction and requires admin. */
export async function requireAdmin(tx: Db, actorEmail: string): Promise<Actor> {
  const actor = await loadActor(tx, actorEmail);
  if (!actor.isAdmin) throw new AppError("FORBIDDEN", "Admins only");
  return actor;
}

export async function listAdmins(
  db: Db,
): Promise<{ email: string; addedBy: string | null; createdAt: Date | null }[]> {
  return db
    .select({
      email: admins.email,
      addedBy: admins.addedBy,
      createdAt: admins.createdAt,
    })
    .from(admins)
    .orderBy(asc(admins.createdAt), asc(admins.email));
}

/** Locks every admin row so concurrent admin changes serialise. */
function lockAdmins(tx: Db) {
  return tx.select().from(admins).for("update");
}

export async function addAdmin(
  db: Db,
  actorEmail: string,
  rawEmail: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await lockAdmins(tx);
    const actor = await requireAdmin(tx, actorEmail);
    const email = companyEmail(rawEmail);
    await tx
      .insert(admins)
      .values({ email, addedBy: actor.email })
      .onConflictDoNothing();
  });
}

export async function removeAdmin(
  db: Db,
  actorEmail: string,
  rawEmail: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const all = await lockAdmins(tx);
    await requireAdmin(tx, actorEmail);
    const email = normEmail(rawEmail);
    if (!all.some((a) => a.email === email))
      throw new AppError("NOT_FOUND", "Not an admin");
    if (all.length <= 1)
      throw new AppError("CONFLICT", "Can't remove the last admin");
    await tx.delete(admins).where(eq(admins.email, email));
  });
}
