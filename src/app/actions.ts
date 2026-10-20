"use server";

import { revalidatePath } from "next/cache";
import { getActorOrRedirect } from "@/auth";
import { getDb, type Db } from "@/db/client";
import { AppError } from "@/server/errors";
import { addAdmin, removeAdmin } from "@/server/admins";
import {
  addPerson,
  type EmojiInput,
  removePerson,
  resetPersonStyle,
  setPersonShare,
  updateMyProfile,
  updatePerson,
} from "@/server/people";
import { getSlackClient } from "@/server/slack-client";
import { postSpinToSlack, replyUndone } from "@/server/slack-post";
import { spin, undoAndRespin, undoSpin, type SpinResult } from "@/server/wheel";

type ActionResult<T> = T | { error: string };

async function run<T>(fn: (db: Db, actorEmail: string) => Promise<T>): Promise<ActionResult<T>> {
  const actor = await getActorOrRedirect();
  try {
    const result = await fn(await getDb(), actor.email);
    revalidatePath("/");
    revalidatePath("/history");
    revalidatePath("/admin");
    revalidatePath("/profile");
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
  return run(async (db, email) => {
    const r = await undoSpin(db, spinId, email);
    // After the commit: Slack can never fail the undo.
    await replyUndone(db, getSlackClient(), spinId);
    return r;
  });
}

export async function postToSlackAction(spinId: number) {
  if (!validSpinId(spinId)) return { error: "Spin not found" };
  return run(async (db) => {
    await postSpinToSlack(db, getSlackClient(), spinId);
    return OK;
  });
}

export async function undoAndRespinAction(spinId: number) {
  if (!validSpinId(spinId)) return { error: "Spin not found" };
  return run(async (db, email) => {
    const r = await undoAndRespin(db, spinId, email);
    await replyUndone(db, getSlackClient(), spinId);
    return r;
  });
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

const isEmojiInput = (e: unknown): e is EmojiInput | null => {
  if (e === null) return true;
  if (typeof e !== "object") return false;
  const x = e as Record<string, unknown>;
  return (x.kind === "native" && isStr(x.value)) || (x.kind === "slack" && isStr(x.name));
};

export async function updateProfileAction(input: { color?: string; emoji?: EmojiInput | null }) {
  if (typeof input !== "object" || input === null) return BAD_INPUT;
  if (input.color !== undefined && !isStr(input.color)) return BAD_INPUT;
  if (input.emoji !== undefined && !isEmojiInput(input.emoji)) return BAD_INPUT;
  return run(async (db, actor) => {
    const patch: { color?: string; emoji?: EmojiInput | null } = {};
    if (input.color !== undefined) patch.color = input.color;
    if (input.emoji !== undefined) {
      // Rebuild so extra client-supplied fields (e.g. a forged url) never reach the service.
      patch.emoji =
        input.emoji === null
          ? null
          : input.emoji.kind === "native"
            ? { kind: "native", value: input.emoji.value }
            : { kind: "slack", name: input.emoji.name };
    }
    await updateMyProfile(db, actor, patch);
    return OK;
  });
}
