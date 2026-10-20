import { GifReader } from "omggif";
import { PNG } from "pngjs";

const FETCH_TIMEOUT_MS = 5000;

/** Decode a GIF's first frame and re-encode it as PNG (Satori can't render GIFs). */
export function gifFirstFramePng(gif: Buffer): Buffer {
  const reader = new GifReader(gif);
  const png = new PNG({ width: reader.width, height: reader.height });
  reader.decodeAndBlitFrameRGBA(0, png.data);
  return PNG.sync.write(png);
}

const isGif = (bytes: Buffer, type: string) =>
  type.includes("image/gif") || bytes.subarray(0, 4).toString("latin1") === "GIF8";

type Fetch = (url: string, init?: { signal?: AbortSignal }) => Promise<Response>;

/**
 * The emoji image as a data uri Satori can draw: GIFs become a still PNG of the first frame.
 * Null on any fetch/decode failure or timeout, so the caller can fall back to initials.
 */
export async function emojiDataUri(
  url: string,
  fetchImpl: Fetch = fetch,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    const type = res.headers.get("content-type") ?? "image/png";
    if (isGif(bytes, type)) return `data:image/png;base64,${gifFirstFramePng(bytes).toString("base64")}`;
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
