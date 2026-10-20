"use server";

import { revalidatePath } from "next/cache";
import { getActorOrRedirect } from "@/auth";
import { getDb, type Db } from "@/db/client";
import { AppError } from "@/server/errors";
import { addAdmin, removeAdmin } from "@/server/admins";
import {
  addPerson,
  removePerson,
  resetPersonStyle,
  setPersonShare,
  updatePerson,
} from "@/server/people";
import { spin, undoAndRespin, undoSpin, type SpinResult } from "@/server/wheel";

type ActionResult<T> = T | { error: string };

async function run<T>(fn: (db: Db, actorEmail: string) => Promise<T>): Promise<ActionResult<T>> {
  const actor = await getActorOrRedirect();
  try {
    const result = await fn(await getDb(), actor.email);
    revalidatePath("/");
    revalidatePath("/history");
    revalidatePath("/admin");
    return result;
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    throw e;
  }
}

// Server actions are public endpoints: never trust the argument's type.
const validSpinId = (spinId: unknown): spinId is number =>
  typeof spinId === "number" && Number.isSafeInteger(spinId) && spinId > 0;

export async function spinAction(): Promise<ActionResult<SpinResult>> {
  return run((db, email) => spin(db, email));
}

export async function undoAction(spinId: number) {
  if (!validSpinId(spinId)) return { error: "Spin not found" };
  return run((db, email) => undoSpin(db, spinId, email));
}

export async function undoAndRespinAction(spinId: number) {
  if (!validSpinId(spinId)) return { error: "Spin not found" };
  return run((db, email) => undoAndRespin(db, spinId, email));
}

const isId = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0;
const isStr = (v: unknown): v is string => typeof v === "string";
const BAD_INPUT = { error: "Invalid request" } as const;
const OK = { ok: true } as const;

export async function addPersonAction(input: { name: string; email: string }) {
  if (!isStr(input?.name) || !isStr(input?.email)) return BAD_INPUT;
  return run(async (db, actor) => {
    await addPerson(db, actor, { name: input.name, email: input.email });
    return OK;
  });
}

export async function removePersonAction(id: number) {
  if (!isId(id)) return BAD_INPUT;
  return run(async (db, actor) => {
    await removePerson(db, actor, id);
    return OK;
  });
}

export async function updatePersonAction(id: number, patch: { name: string; email: string }) {
  if (!isId(id) || !isStr(patch?.name) || !isStr(patch?.email)) return BAD_INPUT;
  return run(async (db, actor) => {
    await updatePerson(db, actor, id, { name: patch.name, email: patch.email });
    return OK;
  });
}

/** `sharePct` is a percentage (0-100); the service takes a fraction. */
export async function setShareAction(id: number, sharePct: number) {
  if (!isId(id) || typeof sharePct !== "number" || !Number.isFinite(sharePct)) return BAD_INPUT;
  return run(async (db, actor) => {
    await setPersonShare(db, actor, id, sharePct / 100);
    return OK;
  });
}

export async function resetStyleAction(id: number, which: { color?: boolean; emoji?: boolean }) {
  if (!isId(id) || typeof which !== "object" || which === null) return BAD_INPUT;
  return run(async (db, actor) => {
    await resetPersonStyle(db, actor, id, {
      color: which.color === true ? true : undefined,
      emoji: which.emoji === true ? true : undefined,
    });
    return OK;
  });
}

export async function addAdminAction(email: string) {
  if (!isStr(email)) return BAD_INPUT;
  return run(async (db, actor) => {
    await addAdmin(db, actor, email);
    return OK;
  });
}

export async function removeAdminAction(email: string) {
  if (!isStr(email)) return BAD_INPUT;
  return run(async (db, actor) => {
    await removeAdmin(db, actor, email);
    return OK;
  });
}
