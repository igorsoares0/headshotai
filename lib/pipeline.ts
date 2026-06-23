/**
 * Order lifecycle (reqs §20), driven by polling. Each GET on an order calls
 * advanceOrder(), which makes the next non-blocking Replicate calls and returns
 * immediately:
 *
 *   training ─▶ generating ─▶ gating ─▶ scoring ─▶ upscaling ─▶ ready
 *      │            │            │          │           │
 *      └────────────┴────────────┴──────────┴───────────┴──▶ failed
 *
 * No job queue: the work is mostly waiting on Replicate, so each tick just
 * checks status and fires the next step. Good enough for the MVP slice; a real
 * deployment would use Replicate webhooks instead of client polling.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import JSZip from "jszip";
import {
  GEN_BASE,
  GATE,
  AESTHETIC_WEIGHT,
  DEDUPE_HAMMING,
  MAX_GEN_PER_ORDER,
  REFERENCE_COUNT,
  STYLES,
  distribute,
  initialGenCount,
} from "./recipe";
import {
  createAesthetic,
  createFaceMatch,
  createGeneration,
  createNsfw,
  createUpscale,
  extractSimilarity,
  getPrediction,
  getTraining,
  isTerminal,
  startTraining,
  uploadFile,
} from "./replicate";
import { type Order, newOrderId, saveOrder } from "./store";

export interface UploadInput {
  buffer: Buffer;
  name: string;
  type: string;
}

/**
 * Public callback URL for Replicate webhooks. Set WEBHOOK_BASE_URL to a
 * publicly reachable origin (a tunnel like cloudflared/ngrok in dev, the deploy
 * URL in prod). When unset, we fall back to poll-driven advancement.
 */
function webhookUrl(orderId: string): string | undefined {
  const base = process.env.WEBHOOK_BASE_URL?.replace(/\/$/, "");
  return base ? `${base}/api/webhooks/replicate/${orderId}` : undefined;
}

/** Downscale a selfie to ≤1024px JPEG (reqs §11 dataset prep). */
async function downscale(buf: Buffer): Promise<Buffer> {
  return sharp(buf)
    .rotate() // honor EXIF orientation
    .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/** Create an order: preprocess selfies, upload, kick off LoRA training. */
export async function startOrder(
  files: UploadInput[],
  packId: string,
  userId: string,
  targetCount: number,
  subject: string,
  styles: string[],
): Promise<Order> {
  const processed = await Promise.all(files.map((f) => downscale(f.buffer)));

  // build training zip
  const zip = new JSZip();
  processed.forEach((b, i) => zip.file(`${String(i).padStart(2, "0")}.jpg`, b));
  const zipBuf = await zip.generateAsync({ type: "nodebuffer" });
  const zipUrl = await uploadFile(zipBuf, "train.zip", "application/zip");

  // upload a few references for the identity gate
  const refs = processed.slice(0, REFERENCE_COUNT);
  const referenceUrls = await Promise.all(
    refs.map((b, i) => uploadFile(b, `ref_${i}.jpg`, "image/jpeg")),
  );

  // id is generated first so the training webhook can carry it
  const id = newOrderId();
  const { id: trainingId, destination } = await startTraining(zipUrl, webhookUrl(id));

  const order: Order = {
    id,
    userId,
    createdAt: Date.now(),
    status: "training",
    packId,
    targetCount,
    subject,
    styles,
    trainingId,
    destination,
    referenceUrls,
    photoCount: files.length,
    genSeconds: 0,
    shots: [],
  };
  await saveOrder(order);
  return order;
}

// serialize ticks per order within this process to avoid double-firing steps
const advancing = new Set<string>();
// a trigger (webhook/poll) that arrives mid-tick sets this so we re-run and
// don't lose the wake-up (e.g. the last generation completing during a tick)
const dirty = new Set<string>();

export async function advanceOrder(order: Order): Promise<Order> {
  if (order.status === "ready" || order.status === "failed") return order;
  if (advancing.has(order.id)) {
    dirty.add(order.id);
    return order;
  }
  advancing.add(order.id);
  try {
    do {
      dirty.delete(order.id);
      try {
        if (order.status === "training") await tickTraining(order);
        else if (order.status === "generating") await tickGenerating(order);
        else if (order.status === "gating") await tickGating(order);
        else if (order.status === "scoring") await tickScoring(order);
        else if (order.status === "upscaling") await tickUpscaling(order);
        await saveOrder(order);
      } catch (err) {
        // Transient (network) errors must NOT kill the order — retried on the
        // next trigger. Terminal failures are set inside ticks without throwing.
        console.error(
          `[order ${order.id}] tick error (will retry):`,
          err instanceof Error ? err.message : err,
        );
      }
    } while (dirty.has(order.id) && !["ready", "failed"].includes(order.status));
    return order;
  } finally {
    advancing.delete(order.id);
  }
}

async function tickTraining(order: Order): Promise<void> {
  const tr = await getTraining(order.trainingId);
  if (tr.status === "failed" || tr.status === "canceled") {
    order.status = "failed";
    order.error = tr.error || "training failed";
    return;
  }
  if (tr.status !== "succeeded") return; // still training
  if (!tr.output?.version) {
    order.status = "failed";
    order.error = "training produced no version";
    return;
  }
  order.trainedVersion = tr.output.version;
  order.trainSeconds = tr.metrics?.predict_time;

  // build the over-generation plan as pending shots (no predictions yet);
  // tickGenerating fires them idempotently so a blip never re-fires the batch
  order.shots = [];
  addPendingShots(order, distribute(initialGenCount(order.targetCount), order.styles));
  order.status = "generating";
}

/** Append `pending` shots per style, continuing each style's idx sequence. */
function addPendingShots(order: Order, perStyle: Record<string, number>): void {
  for (const style of order.styles) {
    const start = order.shots.filter((s) => s.style === style).length;
    for (let i = 0; i < perStyle[style]; i++) {
      order.shots.push({
        id: "",
        style,
        idx: start + i,
        seed: Math.floor(Math.random() * 2 ** 31),
        status: "pending",
      });
    }
  }
}

async function tickGenerating(order: Order): Promise<void> {
  const versionHash = order.trainedVersion!.split(":").pop()!;

  // 1) create a prediction for any shot that doesn't have one yet
  const subject = order.subject ?? "person"; // legacy orders predate the descriptor
  for (const shot of order.shots) {
    if (shot.status !== "pending") continue;
    const pred = await createGeneration(
      versionHash,
      STYLES[shot.style].prompt(subject),
      shot.seed,
      { ...GEN_BASE, ...(STYLES[shot.style].params ?? {}) },
      webhookUrl(order.id),
    );
    shot.id = pred.id;
    shot.status = pred.status;
    await saveOrder(order); // persist immediately so a later failure doesn't re-create
  }

  // 2) poll in-flight predictions; download as each succeeds
  for (const shot of order.shots) {
    if (!shot.id) continue;
    if (shot.status === "succeeded" && shot.file) continue; // fully done
    if (isTerminal(shot.status) && shot.status !== "succeeded") continue; // failed/canceled
    const pred = await getPrediction(shot.id);
    if (pred.status === "succeeded") {
      const url = Array.isArray(pred.output) ? (pred.output[0] as string) : (pred.output as string);
      shot.url = url;
      shot.predictTime = pred.metrics?.predict_time;
      shot.file = await downloadShot(order.id, `${shot.style}_${shot.idx}.jpg`, url);
      shot.status = "succeeded"; // only mark done after the file is on disk
      await saveOrder(order);
    } else {
      shot.status = pred.status;
    }
  }

  if (!order.shots.every((s) => isTerminal(s.status))) return; // still generating

  // all generations resolved → fire identity gate on the successful ones.
  // Compare each output against every reference selfie (max wins in gating), so
  // one bad reference angle can't wrongly fail a good shot. Fired per-reference
  // and saved incrementally so a mid-loop blip resumes instead of re-firing.
  order.genSeconds = order.shots.reduce((a, s) => a + (s.predictTime ?? 0), 0);
  for (const shot of order.shots) {
    if (shot.status !== "succeeded" || !shot.url) continue;
    if (shot.matchIds && shot.matchIds.length === order.referenceUrls.length) continue;
    shot.matchIds ??= [];
    for (let i = shot.matchIds.length; i < order.referenceUrls.length; i++) {
      const match = await createFaceMatch(order.referenceUrls[i], shot.url, webhookUrl(order.id));
      shot.matchIds.push(match.id);
      await saveOrder(order);
    }
  }
  order.status = "gating";
}

async function tickGating(order: Order): Promise<void> {
  for (const shot of order.shots) {
    if (!shot.matchIds || shot.matchIds.length === 0 || shot.similarity !== undefined) continue;
    const preds = await Promise.all(shot.matchIds.map((id) => getPrediction(id)));
    if (!preds.every((p) => isTerminal(p.status))) continue; // some refs still matching
    // best score across references; null if no reference detected a face
    const scores = preds
      .filter((p) => p.status === "succeeded")
      .map((p) => extractSimilarity(p.output))
      .filter((s): s is number => s !== null);
    const best = scores.length ? Math.max(...scores) : null;
    shot.similarity = best;
    shot.pass = best !== null && best >= GATE;
  }

  const pending = order.shots.some(
    (s) => s.matchIds && s.matchIds.length > 0 && s.similarity === undefined,
  );
  if (pending) return; // still gating

  const passers = order.shots.filter((s) => s.pass && s.file);

  // Under-delivered? Top up with another batch (bounded by the per-order cap)
  // and loop back through generation. Spike pass rate is ~100%, so this rarely
  // fires — it's a safety net to honor the pack's promised count.
  if (passers.length < order.targetCount && order.shots.length < MAX_GEN_PER_ORDER) {
    const deficit = order.targetCount - passers.length;
    const room = MAX_GEN_PER_ORDER - order.shots.length;
    const add = Math.min(Math.ceil(deficit * 1.4), room);
    if (add > 0) {
      addPendingShots(order, distribute(add, order.styles));
      order.status = "generating";
      return;
    }
  }

  // Identity survivors are settled. Hand off to stage-2 scoring (aesthetics +
  // safety), which then dedupes, ranks, and selects the delivered top-N.
  order.status = "scoring";
}

/**
 * Stage-2 quality (reqs §16/§30): the identity gate decided "looks like them";
 * this decides "is a good, safe, non-duplicate photo". For each survivor we score
 * aesthetics (1-10) and run an NSFW classifier, then dedupe near-identical poses
 * and rank by a weighted blend of identity + aesthetics, delivering the top-N.
 * Both model calls fail open (neutral score / treated safe) so a flaky scorer
 * never blocks an otherwise-good delivery.
 */
async function tickScoring(order: Order): Promise<void> {
  const passers = order.shots.filter((s) => s.pass && s.file && s.url);

  // 1) fire aesthetic + safety predictions for each survivor (idempotent)
  for (const shot of passers) {
    if (!shot.aestheticId) {
      shot.aestheticId = (await createAesthetic(shot.url!, webhookUrl(order.id))).id;
      await saveOrder(order);
    }
    if (!shot.safetyId) {
      shot.safetyId = (await createNsfw(shot.url!, webhookUrl(order.id))).id;
      await saveOrder(order);
    }
  }

  // 2) resolve both per survivor
  for (const shot of passers) {
    if (shot.aestheticId && shot.aesthetic === undefined) {
      const p = await getPrediction(shot.aestheticId);
      if (p.status === "succeeded") {
        const n = typeof p.output === "number" ? p.output : Number(p.output);
        shot.aesthetic = Number.isFinite(n) ? n : null;
      } else if (isTerminal(p.status)) shot.aesthetic = null; // fail open (neutral)
    }
    if (shot.safetyId && shot.nsfw === undefined) {
      const p = await getPrediction(shot.safetyId);
      if (p.status === "succeeded") {
        shot.nsfw = String(p.output).toLowerCase().includes("nsfw");
      } else if (isTerminal(p.status)) shot.nsfw = false; // fail open (treat safe)
    }
  }

  const pending = passers.some((s) => s.aesthetic === undefined || s.nsfw === undefined);
  if (pending) return; // still scoring

  // 3) compute a perceptual hash for each survivor (local, cached)
  for (const shot of passers) {
    if (!shot.phash) shot.phash = await aHash(join(process.cwd(), "public", shot.file!));
    await saveOrder(order);
  }

  // 4) rank safe survivors by the combined score, then drop near-duplicate poses
  // (keep the higher-ranked of each pair), then deliver the top-N.
  const ranked = passers
    .filter((s) => !s.nsfw)
    .sort((a, b) => rankScore(b) - rankScore(a));

  const kept: typeof ranked = [];
  for (const shot of ranked) {
    const dupe = kept.some((k) => k.phash && shot.phash && hamming(k.phash, shot.phash) <= DEDUPE_HAMMING);
    if (!dupe) kept.push(shot);
  }

  order.shots.forEach((s) => (s.delivered = false));
  kept.slice(0, order.targetCount).forEach((s) => (s.delivered = true));

  // Hand off to the upscale phase (reqs §17). tickUpscaling no-ops to `ready`
  // immediately if nothing was delivered.
  order.status = "upscaling";
}

/** Weighted delivery score: identity is primary, aesthetics curates (reqs §16). */
function rankScore(s: Order["shots"][number]): number {
  const identity = s.similarity ?? 0; // 0-1
  const aesthetic = (s.aesthetic ?? 5) / 10; // 1-10 → 0-1, neutral 5 when unscored
  return (1 - AESTHETIC_WEIGHT) * identity + AESTHETIC_WEIGHT * aesthetic;
}

/** 64-bit average hash (as a 64-char bit string) of an image, for dedupe. */
async function aHash(path: string): Promise<string> {
  const { data } = await sharp(path)
    .greyscale()
    .resize(8, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let mean = 0;
  for (let i = 0; i < 64; i++) mean += data[i];
  mean /= 64;
  let bits = "";
  for (let i = 0; i < 64; i++) bits += data[i] >= mean ? "1" : "0";
  return bits;
}

/** Hamming distance between two equal-length bit strings. */
function hamming(a: string, b: string): number {
  let n = 0;
  for (let i = 0; i < a.length && i < b.length; i++) if (a[i] !== b[i]) n++;
  return n;
}

/**
 * Upscale + face-restore the delivered (top-N) images only — generating 1.4× and
 * upscaling all of them would burn money on shots we discard. We upload the local
 * file to Replicate (the original output URL may have expired by now) and run
 * Real-ESRGAN. A failed upscale falls back to the original so it never blocks
 * delivery. Idempotent: each shot's upscaleId/upscaledFile gate re-firing.
 */
async function tickUpscaling(order: Order): Promise<void> {
  const delivered = order.shots.filter((s) => s.delivered && s.file);

  // 1) fire an upscale for any delivered shot that doesn't have one yet
  for (const shot of delivered) {
    if (shot.upscaleId) continue;
    const buf = await readFile(join(process.cwd(), "public", shot.file!));
    const srcUrl = await uploadFile(buf, `src_${shot.style}_${shot.idx}.jpg`, "image/jpeg");
    const pred = await createUpscale(srcUrl, webhookUrl(order.id));
    shot.upscaleId = pred.id;
    await saveOrder(order); // persist before the next create so we don't re-fire
  }

  // 2) poll upscales; download the 2K file as each finishes
  for (const shot of delivered) {
    if (!shot.upscaleId || shot.upscaledFile) continue;
    const pred = await getPrediction(shot.upscaleId);
    if (pred.status === "succeeded") {
      const url = Array.isArray(pred.output) ? (pred.output[0] as string) : (pred.output as string);
      shot.upscaledUrl = url;
      shot.upscaledFile = await downloadShot(order.id, `${shot.style}_${shot.idx}_2k.jpg`, url);
      await saveOrder(order);
    } else if (isTerminal(pred.status)) {
      shot.upscaledFile = shot.file; // failed → deliver the original, don't block
      await saveOrder(order);
    }
  }

  if (delivered.every((s) => s.upscaledFile)) order.status = "ready";
}

async function downloadShot(orderId: string, name: string, url: string): Promise<string> {
  const dir = join(process.cwd(), "public", "generated", orderId);
  await mkdir(dir, { recursive: true });
  let res: Response | undefined;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      res = await fetch(url);
      if (res.ok) break;
    } catch {
      /* transient — retry */
    }
    await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
  }
  if (!res || !res.ok) throw new Error(`download failed: ${name}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(join(dir, name), buf);
  return `/generated/${orderId}/${name}`;
}
