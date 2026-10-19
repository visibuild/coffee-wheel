import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { people, slackEmojis, weightChanges, type Emoji, type Person } from "@/db/schema";
import { NOT_ON_WHEEL } from "@/lib/copy";
import { addEntry, removeEntry, setShare, shareOf } from "@/lib/weights";
import { companyEmail, requireAdmin } from "./admins";
import { loadActor } from "./actor";
import { AppError } from "./errors";
import { lockActive, lockWheel, writeWeights } from "./weights-store";

const COLOR_RE = /^#[0-9a-f]{6}$/i;

async function getPerson(tx: Db, id: number): Promise<Person> {
  const [row] = await tx.select().from(people).where(eq(people.id, id));
  if (!row) throw new AppError("NOT_FOUND", "Person not found");
  return row;
}

export async function addPerson(
  db: Db,
  actorEmail: string,
  input: { name: string; email: string },
): Promise<Person> {
  return db.transaction(async (tx) => {
    await requireAdmin(tx, actorEmail);
    await lockWheel(tx);
    const rows = await lockActive(tx);
    const email = companyEmail(input.email);
    const name = input.name.trim();
    if (!name) throw new AppError("INVALID", "Name is required");

    const [existing] = await tx
      .select()
      .from(people)
      .where(eq(people.email, email));
    if (existing?.active)
      throw new AppError("CONFLICT", "That person is already on the wheel");

    const share = 1 / (rows.length + 1);
    let id: number;
    if (existing) {
      // Restore: keeps colour, emoji and history.
      await tx
        .update(people)
        .set({ active: true, name, weight: share })
        .where(eq(people.id, existing.id));
      id = existing.id;
    } else {
      const [created] = await tx
        .insert(people)
        .values({ name, email, weight: share })
        .returning();
      id = created.id;
    }
    const entries = rows.map((r) => ({ id: r.id, weight: r.weight }));
    await writeWeights(tx, rows, addEntry(entries, id));
    return getPerson(tx, id);
  });
}

export async function removePerson(
  db: Db,
  actorEmail: string,
  personId: number,
): Promise<void> {
  await db.transaction(async (tx) => {
    await requireAdmin(tx, actorEmail);
    await lockWheel(tx);
    const rows = await lockActive(tx);
    if (!rows.some((r) => r.id === personId))
      throw new AppError("NOT_FOUND", "Person not found");
    await tx
      .update(people)
      .set({ active: false })
      .where(eq(people.id, personId));
    const entries = rows.map((r) => ({ id: r.id, weight: r.weight }));
    await writeWeights(tx, rows, removeEntry(entries, personId));
  });
}

export async function updatePerson(
  db: Db,
  actorEmail: string,
  personId: number,
  patch: { name?: string; email?: string },
): Promise<Person> {
  return db.transaction(async (tx) => {
    await requireAdmin(tx, actorEmail);
    await lockWheel(tx);
    const current = await getPerson(tx, personId);
    const set: { name?: string; email?: string } = {};
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (!name) throw new AppError("INVALID", "Name is required");
      set.name = name;
    }
    if (patch.email !== undefined) {
      const email = companyEmail(patch.email);
      if (email !== current.email) {
        const [clash] = await tx
          .select({ id: people.id })
          .from(people)
          .where(eq(people.email, email));
        if (clash) throw new AppError("CONFLICT", "That email is already in use");
        set.email = email;
      }
    }
    if (Object.keys(set).length > 0)
      await tx.update(people).set(set).where(eq(people.id, personId));
    return getPerson(tx, personId);
  });
}

export async function setPersonShare(
  db: Db,
  actorEmail: string,
  personId: number,
  share: number,
): Promise<void> {
  await db.transaction(async (tx) => {
    const actor = await requireAdmin(tx, actorEmail);
    await lockWheel(tx);
    const rows = await lockActive(tx);
    if (!rows.some((r) => r.id === personId))
      throw new AppError("NOT_FOUND", "Person not found");
    const entries = rows.map((r) => ({ id: r.id, weight: r.weight }));
    let next;
    try {
      next = setShare(entries, personId, share);
    } catch (e) {
      if (e instanceof RangeError)
        throw new AppError("INVALID", "Share must be between 0% and 100%");
      throw e;
    }
    await writeWeights(tx, rows, next);
    await tx.insert(weightChanges).values({
      personId,
      oldShare: shareOf(entries, personId),
      newShare: shareOf(next, personId),
      changedBy: actor.email,
    });
  });
}

export async function resetPersonStyle(
  db: Db,
  actorEmail: string,
  personId: number,
  which: { color?: true; emoji?: true },
): Promise<Person> {
  return db.transaction(async (tx) => {
    await requireAdmin(tx, actorEmail);
    await getPerson(tx, personId);
    const set: { color?: null; emoji?: null } = {};
    if (which.color) set.color = null;
    if (which.emoji) set.emoji = null;
    if (Object.keys(set).length > 0)
      await tx.update(people).set(set).where(eq(people.id, personId));
    return getPerson(tx, personId);
  });
}

export async function updateMyProfile(
  db: Db,
  actorEmail: string,
  patch: { color?: string; emoji?: Emoji | null },
): Promise<Person> {
  return db.transaction(async (tx) => {
    const { person } = await loadActor(tx, actorEmail);
    if (!person) throw new AppError("FORBIDDEN", NOT_ON_WHEEL);
    const set: { color?: string; emoji?: Emoji | null } = {};
    if (patch.color !== undefined) {
      if (!COLOR_RE.test(patch.color))
        throw new AppError("INVALID", "Colour must look like #aabbcc");
      set.color = patch.color;
    }
    if (patch.emoji !== undefined) {
      const e = patch.emoji;
      if (e === null) set.emoji = null;
      else if (e.kind === "native") {
        if (!e.value) throw new AppError("INVALID", "Emoji is required");
        set.emoji = { kind: "native", value: e.value };
      } else {
        const [cached] = await tx
          .select()
          .from(slackEmojis)
          .where(eq(slackEmojis.name, e.name));
        if (!cached) throw new AppError("INVALID", "Unknown Slack emoji");
        set.emoji = { kind: "slack", name: cached.name, url: cached.url };
      }
    }
    if (Object.keys(set).length > 0)
      await tx.update(people).set(set).where(eq(people.id, person.id));
    return getPerson(tx, person.id);
  });
}
