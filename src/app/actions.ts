"use server";

import { revalidatePath } from "next/cache";
import { getActorOrRedirect } from "@/auth";
import { getDb, type Db } from "@/db/client";
import { AppError } from "@/server/errors";
import { spin, undoAndRespin, undoSpin, type SpinResult } from "@/server/wheel";

type ActionResult<T> = T | { error: string };

async function run<T>(fn: (db: Db, actorEmail: string) => Promise<T>): Promise<ActionResult<T>> {
  const actor = await getActorOrRedirect();
  try {
    const result = await fn(await getDb(), actor.email);
    revalidatePath("/");
    revalidatePath("/history");
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
