import { GifWriter } from "omggif";
import { PNG } from "pngjs";
import { describe, expect, it, vi } from "vitest";
import { emojiDataUri, gifFirstFramePng } from "./emoji-image";

/** A 2x1 GIF: frame 1 is red|blue, frame 2 is all green. */
function tinyGif(): Buffer {
  const buf = Buffer.alloc(1024);
  const w = new GifWriter(buf, 2, 1, { loop: 0, palette: [0xff0000, 0x0000ff, 0x00ff00, 0x000000] });
  w.addFrame(0, 0, 2, 1, [0, 1], { delay: 10 });
  w.addFrame(0, 0, 2, 1, [2, 2], { delay: 10 });
  return buf.subarray(0, w.end());
}

const response = (body: Buffer, type: string) =>
  ({ ok: true, headers: new Headers({ "content-type": type }), arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.length) }) as unknown as Response;

describe("gifFirstFramePng", () => {
  it("re-encodes only the first frame as a PNG", () => {
    const png = PNG.sync.read(gifFirstFramePng(tinyGif()));
    expect([png.width, png.height]).toEqual([2, 1]);
    expect([...png.data]).toEqual([255, 0, 0, 255, 0, 0, 255, 255]);
  });

  it("throws on non-GIF input", () => {
    expect(() => gifFirstFramePng(Buffer.from("not a gif"))).toThrow();
  });
});

describe("emojiDataUri", () => {
  it("converts GIFs (by magic bytes) to a PNG data uri", async () => {
    const uri = await emojiDataUri("https://e/x.gif", async () => response(tinyGif(), "application/octet-stream"));
    expect(uri).toMatch(/^data:image\/png;base64,/);
    const png = PNG.sync.read(Buffer.from(uri!.split(",")[1], "base64"));
    expect(png.width).toBe(2);
  });

  it("passes other images through with their content type", async () => {
    const bytes = PNG.sync.write(new PNG({ width: 1, height: 1 }));
    const uri = await emojiDataUri("https://e/x.png", async () => response(bytes, "image/png"));
    expect(uri).toBe(`data:image/png;base64,${bytes.toString("base64")}`);
  });

  it("returns null on a failed fetch, bad status, or undecodable GIF", async () => {
    expect(await emojiDataUri("u", async () => { throw new Error("boom"); })).toBeNull();
    expect(await emojiDataUri("u", async () => ({ ok: false }) as Response)).toBeNull();
    expect(await emojiDataUri("u", async () => response(Buffer.from("GIF89a garbage"), "image/gif"))).toBeNull();
  });

  it("returns null when the fetch outlives the timeout", async () => {
    vi.useFakeTimers();
    try {
      const p = emojiDataUri("u", (_u, init) => new Promise((_, rej) => init?.signal?.addEventListener("abort", () => rej(new Error("aborted")))), 5000);
      await vi.advanceTimersByTimeAsync(5000);
      expect(await p).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
