import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/db/client";
import { getSlackClient } from "@/server/slack-client";
import { refreshSlackEmojis } from "@/server/slack-emoji-sync";

function isAuthorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Reads the request headers, so this handler is always dynamic (never prerendered).
export async function GET(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const client = getSlackClient();
  if (!client) return Response.json({ error: "Slack isn't configured" }, { status: 503 });
  const { count } = await refreshSlackEmojis(await getDb(), client);
  return Response.json({ count });
}
