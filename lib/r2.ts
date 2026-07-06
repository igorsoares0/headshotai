/**
 * Cloudflare R2 object storage (reqs §26/§29). The bucket is private: writes go
 * through SigV4-signed requests here, and every read — browser `<img>`, download
 * links, URLs handed to Replicate — uses a presigned, time-limited GET URL.
 * The app never proxies image bytes (reqs §241).
 *
 * Bucket layout (per order):
 *   datasets/<orderId>/train.zip        LoRA training zip
 *   uploads/<orderId>/ref_<i>.jpg       reference selfies for the identity gate
 *   generated/<orderId>/<style>_<i>.jpg 1024px generations
 *   upscaled/<orderId>/<style>_<i>.jpg  2K upscales of the delivered shots
 */
import "server-only";
import { setDefaultResultOrder } from "node:dns";
import { AwsClient } from "aws4fetch";

// WSL/undici often resolves AAAA (IPv6) first and the connection silently
// fails ("fetch failed"). Prefer IPv4 — same fix as lib/replicate.ts. Set here
// too because module load order isn't guaranteed.
try {
  setDefaultResultOrder("ipv4first");
} catch {
  /* not supported on this runtime */
}

/** Presign TTL for browser-facing URLs (gallery, order polling). */
export const UI_TTL = 3600; // 1h
/** Presign TTL for URLs handed to Replicate — training/predictions can queue. */
export const REPLICATE_TTL = 24 * 3600;

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

let cached: { client: AwsClient; base: string } | null = null;
function cfg(): { client: AwsClient; base: string } {
  if (cached) return cached;
  const need = (name: string): string => {
    const v = process.env[name];
    if (!v) throw new Error(`${name} not set (add it to .env.local)`);
    return v;
  };
  const accountId = need("R2_ACCOUNT_ID");
  const endpoint =
    process.env.R2_ENDPOINT?.replace(/\/$/, "") ?? `https://${accountId}.r2.cloudflarestorage.com`;
  cached = {
    client: new AwsClient({
      accessKeyId: need("R2_ACCESS_KEY_ID"),
      secretAccessKey: need("R2_SECRET_ACCESS_KEY"),
      region: "auto",
      service: "s3",
    }),
    base: `${endpoint}/${need("R2_BUCKET")}`,
  };
  return cached;
}

function objectUrl(key: string): string {
  return `${cfg().base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * True when `v` is an R2 object key (vs a legacy `/generated/...` disk path or
 * an absolute URL). Gates all signing so pre-R2 dev orders degrade to the UI's
 * missing-image placeholder instead of broken requests.
 */
export function isR2Key(v: string | undefined | null): v is string {
  return !!v && !v.startsWith("/") && !v.startsWith("http");
}

/** Store an object. Retries on 5xx/network like lib/replicate.ts rfetch. */
export async function r2Put(key: string, body: Buffer, contentType: string): Promise<void> {
  const { client } = cfg();
  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await client.fetch(objectUrl(key), {
        method: "PUT",
        headers: { "Content-Type": contentType, "Content-Length": String(body.byteLength) },
        body: new Uint8Array(body),
      });
      if (res.ok) return;
      lastErr = new Error(`R2 PUT ${key}: ${res.status} ${await res.text()}`);
      if (res.status < 500) break; // 4xx won't heal on retry
    } catch (e) {
      lastErr = e; // transient network error
    }
    await sleep(2 ** attempt * 500);
  }
  throw lastErr;
}

/** Fetch an object's bytes (server-side, e.g. for the perceptual hash). */
export async function r2GetBuffer(key: string): Promise<Buffer> {
  const res = await cfg().client.fetch(objectUrl(key));
  if (!res.ok) throw new Error(`R2 GET ${key}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Presigns are memoized: X-Amz-Date makes every signature unique, so re-signing
// on each 5s order poll would change every <img src> and bust the browser's
// image cache. An entry is reused for 3/4 of its TTL, so served URLs always
// carry at least TTL/4 of remaining validity.
const signCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Presigned GET URL for `key`. `downloadName` adds a content-disposition
 * override so `<a>` downloads work cross-origin (the `download` attribute
 * alone is ignored there) and the file saves under a friendly name.
 */
export async function r2SignGet(
  key: string,
  opts: { expiresIn?: number; downloadName?: string } = {},
): Promise<string> {
  const expiresIn = opts.expiresIn ?? UI_TTL;
  const cacheKey = `${key}|${expiresIn}|${opts.downloadName ?? ""}`;
  const hit = signCache.get(cacheKey);
  if (hit && Date.now() < hit.expiresAt) return hit.url;

  const url = new URL(objectUrl(key));
  url.searchParams.set("X-Amz-Expires", String(expiresIn));
  if (opts.downloadName) {
    url.searchParams.set(
      "response-content-disposition",
      `attachment; filename="${opts.downloadName}"`,
    );
  }
  const signed = await cfg().client.sign(new Request(url, { method: "GET" }), {
    aws: { signQuery: true },
  });
  if (signCache.size > 5000) signCache.clear(); // crude bound; entries are tiny
  signCache.set(cacheKey, { url: signed.url, expiresAt: Date.now() + expiresIn * 750 });
  return signed.url;
}

/** Delete every object under `prefix` (paged list + parallel deletes). */
export async function r2DeletePrefix(prefix: string): Promise<void> {
  const { client, base } = cfg();
  for (;;) {
    const res = await client.fetch(`${base}?list-type=2&prefix=${encodeURIComponent(prefix)}`);
    if (!res.ok) throw new Error(`R2 LIST ${prefix}: ${res.status}`);
    const xml = await res.text();
    // Keys are app-generated (no XML-special chars), so a regex scan is safe.
    const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1]);
    if (keys.length === 0) return;
    await Promise.all(
      keys.map(async (k) => {
        const del = await client.fetch(objectUrl(k), { method: "DELETE" });
        if (!del.ok && del.status !== 404) throw new Error(`R2 DELETE ${k}: ${del.status}`);
      }),
    );
    // Everything listed was deleted, so re-listing from the start pages through
    // the remainder without continuation-token bookkeeping.
    if (!/<IsTruncated>true<\/IsTruncated>/.test(xml)) return;
  }
}
