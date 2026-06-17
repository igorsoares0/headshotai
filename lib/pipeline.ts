/**
 * Order lifecycle (reqs §20), driven by polling. Each GET on an order calls
 * advanceOrder(), which makes the next non-blocking Replicate calls and returns
 * immediately:
 *
 *   training ──▶ generating ──▶ gating ──▶ ready
 *      │             │             │
 *      └─────────────┴─────────────┴──▶ failed
 *
 * No job queue: the work is mostly waiting on Replicate, so each tick just
 * checks status and fires the next step. Good enough for the MVP slice; a real
 * deployment would use Replicate webhooks instead of client polling.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import JSZip from "jszip";
import {
  GEN_BASE,
  GATE,
  OVERGEN,
  REFERENCE_COUNT,
  STYLES,
  STYLE_KEYS,
  type StyleKey,
} from "./recipe";
import {
  createFaceMatch,
  createGeneration,
  extractSimilarity,
  getPrediction,
  getTraining,
  isTerminal,
  startTraining,
  uploadFile,
} from "./replicate";
import { type Order, type Shot, newOrderId, saveOrder } from "./store";

export interface UploadInput {
  buffer: Buffer;
  name: string;
  type: string;
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
export async function startOrder(files: UploadInput[], packId: string): Promise<Order> {
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

  const { id: trainingId, destination } = await startTraining(zipUrl);

  const order: Order = {
    id: newOrderId(),
    createdAt: Date.now(),
    status: "training",
    packId,
    styles: STYLE_KEYS,
    trainingId,
    destination,
    referenceUrls,
    photoCount: files.length,
    genSeconds: 0,
    shots: [],
  };
  saveOrder(order);
  return order;
}

// serialize ticks per order within this process to avoid double-firing steps
const advancing = new Set<string>();

export async function advanceOrder(order: Order): Promise<Order> {
  if (order.status === "ready" || order.status === "failed") return order;
  if (advancing.has(order.id)) return order;
  advancing.add(order.id);
  try {
    if (order.status === "training") await tickTraining(order);
    else if (order.status === "generating") await tickGenerating(order);
    else if (order.status === "gating") await tickGating(order);
    saveOrder(order);
    return order;
  } catch (err) {
    // Transient (network) errors must NOT kill the order — they're retried on
    // the next poll. Genuine terminal failures are handled inside the ticks,
    // which set status="failed" explicitly without throwing.
    console.error(
      `[order ${order.id}] tick error (will retry):`,
      err instanceof Error ? err.message : err,
    );
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
  const plan: Shot[] = [];
  for (const style of order.styles as StyleKey[]) {
    for (let i = 0; i < OVERGEN; i++) {
      plan.push({ id: "", style, idx: i, seed: Math.floor(Math.random() * 2 ** 31), status: "pending" });
    }
  }
  order.shots = plan;
  order.status = "generating";
}

async function tickGenerating(order: Order): Promise<void> {
  const versionHash = order.trainedVersion!.split(":").pop()!;

  // 1) create a prediction for any shot that doesn't have one yet
  for (const shot of order.shots) {
    if (shot.status !== "pending") continue;
    const pred = await createGeneration(versionHash, STYLES[shot.style].prompt, shot.seed, GEN_BASE);
    shot.id = pred.id;
    shot.status = pred.status;
    saveOrder(order); // persist immediately so a later failure doesn't re-create
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
      saveOrder(order);
    } else {
      shot.status = pred.status;
    }
  }

  if (!order.shots.every((s) => isTerminal(s.status))) return; // still generating

  // all generations resolved → fire identity gate on the successful ones
  order.genSeconds = order.shots.reduce((a, s) => a + (s.predictTime ?? 0), 0);
  for (const shot of order.shots) {
    if (shot.status !== "succeeded" || !shot.url || shot.matchId) continue;
    const match = await createFaceMatch(order.referenceUrls[0], shot.url);
    shot.matchId = match.id;
    saveOrder(order);
  }
  order.status = "gating";
}

async function tickGating(order: Order): Promise<void> {
  for (const shot of order.shots) {
    if (!shot.matchId || shot.similarity !== undefined) continue;
    const pred = await getPrediction(shot.matchId);
    if (!isTerminal(pred.status)) continue;
    if (pred.status === "succeeded") {
      const sim = extractSimilarity(pred.output);
      shot.similarity = sim;
      shot.pass = sim !== null && sim >= GATE;
    } else {
      shot.similarity = null;
      shot.pass = false;
    }
  }

  const pending = order.shots.some((s) => s.matchId && s.similarity === undefined);
  if (!pending) order.status = "ready";
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
