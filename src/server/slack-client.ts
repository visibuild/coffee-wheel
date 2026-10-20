import { WebClient } from "@slack/web-api";

export interface SlackClient {
  listEmoji(): Promise<Record<string, string>>;
  uploadImage(args: {
    channel: string;
    png: Buffer;
    filename: string;
    comment: string;
  }): Promise<{ fileId: string }>;
  findShareTs(fileId: string, channel: string): Promise<string | null>;
  replyInThread(channel: string, ts: string, text: string): Promise<void>;
  lookupUserIdByEmail(email: string): Promise<string | null>;
}

type Share = { ts?: string }[];
type Shares = Record<string, Share>;

function createSlackClient(token: string): SlackClient {
  // Bound the worst case (3 attempts x 15s + backoff, per Slack call) well below the 2-minute
  // stale-claim window in slack-post.ts, so a hung upload can't be re-claimed and double-posted.
  const web = new WebClient(token, { retryConfig: { retries: 2 }, timeout: 15_000 });
  return {
    async listEmoji() {
      const res = await web.emoji.list();
      return res.emoji ?? {};
    },

    async uploadImage({ channel, png, filename, comment }) {
      const res = await web.files.uploadV2({
        channel_id: channel,
        file: png,
        filename,
        initial_comment: comment,
      });
      // uploadV2 resolves to { files: [{ files: [...] }] }; take the first file's id.
      const id = (res as { files?: { files?: { id?: string }[] }[] }).files?.[0]?.files?.[0]?.id;
      if (!id) throw new Error("Slack upload returned no file id");
      return { fileId: id };
    },

    async findShareTs(fileId, channel) {
      const res = await web.files.info({ file: fileId });
      const shares = res.file?.shares as { public?: Shares; private?: Shares } | undefined;
      return shares?.public?.[channel]?.[0]?.ts ?? shares?.private?.[channel]?.[0]?.ts ?? null;
    },

    async replyInThread(channel, ts, text) {
      await web.chat.postMessage({ channel, thread_ts: ts, text });
    },

    async lookupUserIdByEmail(email) {
      try {
        const res = await web.users.lookupByEmail({ email });
        return res.user?.id ?? null;
      } catch (e) {
        if ((e as { data?: { error?: string } }).data?.error === "users_not_found") return null;
        throw e;
      }
    },
  };
}

/** Null when Slack isn't configured. */
export function getSlackClient(): SlackClient | null {
  const token = process.env.SLACK_BOT_TOKEN;
  return token ? createSlackClient(token) : null;
}
