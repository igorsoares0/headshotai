/**
 * Thin Replicate provider (reqs §33). Every call the product makes to the
 * generation backend goes through here, so swapping providers later is a
 * change to this one file. Creates are non-blocking: we POST a prediction and
 * poll it on later ticks rather than holding the request open.
 */
import { setDefaultResultOrder } from "node:dns";
import { createHmac, timingSafeEqual } from "node:crypto";

// WSL/undici often resolves AAAA (IPv6) first and the connection silently
// fails ("fetch failed"). Prefer IPv4, like the Python client and MCP do.
try {
  setDefaultResultOrder("ipv4first");
} catch {
  /* not supported on this runtime */
}
import {
  TRAINER,
  TRAINER_VERSION,
  FACEMATCH_VERSION,
  UPSCALER_VERSION,
  UPSCALE_SCALE,
  AESTHETIC_VERSION,
  NSFW_VERSION,
  MODEL_OWNER,
  MODEL_NAME,
  TRIGGER,
  TRAIN_STEPS,
  LORA_RANK,
} from "./recipe";

const API = "https://api.replicate.com/v1";

let cachedToken: string | null = null;
function token(): string {
  if (cachedToken) return cachedToken;
  // Next loads .env.local / .env into process.env automatically
  const t = process.env.REPLICATE_API_TOKEN;
  if (!t) throw new Error("REPLICATE_API_TOKEN not set (add it to .env.local)");
  cachedToken = t;
  return t;
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" };
}

export interface Prediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: unknown;
  error: string | null;
  metrics?: { predict_time?: number };
  urls?: { get: string };
}

export interface Training {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: { version?: string; weights?: string };
  error: string | null;
  metrics?: { predict_time?: number };
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/** fetch with retry on network errors, 429, and 5xx. */
async function rfetch(path: string, init: RequestInit = {}, retries = 5): Promise<Response> {
  const url = path.startsWith("http") ? path : `${API}${path}`;
  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const r = await fetch(url, init);
      if (r.status === 429 || r.status >= 500) {
        const wait = Number(r.headers.get("retry-after")) || 2 ** attempt;
        await sleep(wait * 1000);
        continue;
      }
      return r;
    } catch (e) {
      lastErr = e; // transient network error ("fetch failed")
      await sleep(2 ** attempt * 500);
    }
  }
  throw lastErr ?? new Error(`Replicate request failed after ${retries} retries`);
}

function getJson(path: string): Promise<Response> {
  return rfetch(path, { headers: authHeaders() });
}

function postJson(path: string, body: unknown): Promise<Response> {
  return rfetch(path, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
}

/** Upload a file to Replicate's Files API; returns a servable URL. */
export async function uploadFile(data: Buffer, filename: string, mime: string): Promise<string> {
  const form = new FormData();
  form.append("content", new Blob([new Uint8Array(data)], { type: mime }), filename);
  const r = await rfetch("/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}` },
    body: form,
  });
  if (!r.ok) throw new Error(`upload failed: ${r.status} ${await r.text()}`);
  const json = await r.json();
  return json.urls.get as string;
}

/** Ensure the destination model exists (idempotent). */
export async function ensureModel(): Promise<string> {
  const full = `${MODEL_OWNER}/${MODEL_NAME}`;
  const r = await getJson(`/models/${MODEL_OWNER}/${MODEL_NAME}`);
  if (r.ok) return full;
  const create = await postJson("/models", {
    owner: MODEL_OWNER,
    name: MODEL_NAME,
    visibility: "private",
    hardware: "gpu-h100",
    description: "Aperture identity LoRA (per-order versions)",
  });
  if (!create.ok) throw new Error(`ensureModel failed: ${create.status} ${await create.text()}`);
  return full;
}

/** When set, Replicate POSTs here when the prediction/training completes. */
function webhookFields(webhook?: string) {
  return webhook ? { webhook, webhook_events_filter: ["completed"] } : {};
}

/** Start LoRA training from a zip URL. Returns the training id + destination. */
export async function startTraining(
  zipUrl: string,
  webhook?: string,
): Promise<{ id: string; destination: string }> {
  const destination = await ensureModel();
  const r = await postJson(`/models/${TRAINER}/versions/${TRAINER_VERSION}/trainings`, {
    destination,
    input: {
      input_images: zipUrl,
      trigger_word: TRIGGER,
      steps: TRAIN_STEPS,
      lora_rank: LORA_RANK,
    },
    ...webhookFields(webhook),
  });
  if (!r.ok) throw new Error(`startTraining failed: ${r.status} ${await r.text()}`);
  const t = (await r.json()) as Training;
  return { id: t.id, destination };
}

export async function getTraining(id: string): Promise<Training> {
  const r = await getJson(`/trainings/${id}`);
  if (!r.ok) throw new Error(`getTraining failed: ${r.status}`);
  return (await r.json()) as Training;
}

/** Create a generation prediction (non-blocking). */
export async function createGeneration(
  versionHash: string,
  prompt: string,
  seed: number,
  base: Record<string, unknown>,
  webhook?: string,
): Promise<Prediction> {
  const r = await postJson("/predictions", {
    version: versionHash,
    input: { ...base, prompt, num_outputs: 1, seed },
    ...webhookFields(webhook),
  });
  if (!r.ok) throw new Error(`createGeneration failed: ${r.status} ${await r.text()}`);
  return (await r.json()) as Prediction;
}

/** Create a face-similarity prediction (non-blocking). */
export async function createFaceMatch(
  refUrl: string,
  outUrl: string,
  webhook?: string,
): Promise<Prediction> {
  const r = await postJson("/predictions", {
    version: FACEMATCH_VERSION,
    input: { image1: refUrl, image2: outUrl },
    ...webhookFields(webhook),
  });
  if (!r.ok) throw new Error(`createFaceMatch failed: ${r.status} ${await r.text()}`);
  return (await r.json()) as Prediction;
}

/** Create an upscale + face-restoration prediction (non-blocking). */
export async function createUpscale(imageUrl: string, webhook?: string): Promise<Prediction> {
  const r = await postJson("/predictions", {
    version: UPSCALER_VERSION,
    input: { image: imageUrl, scale: UPSCALE_SCALE, face_enhance: true },
    ...webhookFields(webhook),
  });
  if (!r.ok) throw new Error(`createUpscale failed: ${r.status} ${await r.text()}`);
  return (await r.json()) as Prediction;
}

/** Create an aesthetic-score prediction (non-blocking). Output is a 1-10 number. */
export async function createAesthetic(imageUrl: string, webhook?: string): Promise<Prediction> {
  const r = await postJson("/predictions", {
    version: AESTHETIC_VERSION,
    input: { image: imageUrl },
    ...webhookFields(webhook),
  });
  if (!r.ok) throw new Error(`createAesthetic failed: ${r.status} ${await r.text()}`);
  return (await r.json()) as Prediction;
}

/** Create an NSFW-classification prediction (non-blocking). Output is a class string. */
export async function createNsfw(imageUrl: string, webhook?: string): Promise<Prediction> {
  const r = await postJson("/predictions", {
    version: NSFW_VERSION,
    input: { image: imageUrl },
    ...webhookFields(webhook),
  });
  if (!r.ok) throw new Error(`createNsfw failed: ${r.status} ${await r.text()}`);
  return (await r.json()) as Prediction;
}

export async function getPrediction(id: string): Promise<Prediction> {
  const r = await getJson(`/predictions/${id}`);
  if (!r.ok) throw new Error(`getPrediction failed: ${r.status}`);
  return (await r.json()) as Prediction;
}

/**
 * face-match returns `output.similarity` as a DICT
 * { cosine, score (0-1 remapped), percentage, description }. The product gates
 * on `.score`. Returns null if no face was detected.
 */
export function extractSimilarity(output: unknown): number | null {
  if (!output || typeof output !== "object") return null;
  const sim = (output as Record<string, unknown>).similarity;
  if (sim && typeof sim === "object") {
    const score = (sim as Record<string, unknown>).score;
    if (typeof score === "number") return score;
  }
  if (typeof sim === "number") return sim;
  return null;
}

export const isTerminal = (s: string) =>
  s === "succeeded" || s === "failed" || s === "canceled";

// --- webhook signature verification (Replicate uses svix-style signing) ---

let cachedSecret: string | null | undefined; // undefined=unfetched, null=unavailable
async function getWebhookSecret(): Promise<string | null> {
  if (cachedSecret !== undefined) return cachedSecret;
  try {
    const r = await getJson("/webhooks/default/secret");
    cachedSecret = r.ok ? (((await r.json()).key as string) ?? null) : null;
  } catch {
    cachedSecret = null;
  }
  return cachedSecret;
}

/**
 * Verify a Replicate webhook came from Replicate (HMAC-SHA256 over
 * `${id}.${timestamp}.${body}`, base64, matched against the webhook-signature
 * header). Returns false if the secret can't be fetched or anything mismatches.
 */
export async function verifyWebhook(
  h: { id: string | null; timestamp: string | null; signature: string | null },
  body: string,
): Promise<boolean> {
  const secret = await getWebhookSecret();
  if (!secret || !h.id || !h.timestamp || !h.signature) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${h.id}.${h.timestamp}.${body}`).digest("base64");
  const expectedBuf = Buffer.from(expected);
  for (const part of h.signature.split(" ")) {
    const sig = Buffer.from(part.includes(",") ? part.split(",")[1] : part);
    if (sig.length === expectedBuf.length && timingSafeEqual(sig, expectedBuf)) return true;
  }
  return false;
}
