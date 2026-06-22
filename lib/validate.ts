/**
 * Local selfie validation (reqs §9/§10). Runs cheap, dependency-free checks with
 * sharp BEFORE any paid work (training is the big spend) so an obviously bad
 * batch — screenshots, tiny crops, blurry or dark shots — is rejected without
 * burning a pack. Deliberately no model-based face detection here: that would
 * mean 10-25 slow synchronous Replicate calls per upload; the downstream ArcFace
 * gate already rejects faceless / wrong-identity outputs.
 */
import sharp from "sharp";

const MIN_DIM = 1024; // §10 resolution check (smaller side)
const BLUR_MIN = 80; // variance-of-Laplacian floor on a 512px grayscale
const DARK_MAX = 30; // mean-luma floor (0-255)
const BRIGHT_MIN = 235; // mean-luma ceiling

export interface SelfieCheck {
  name: string;
  ok: boolean;
  reason?: string;
}

async function checkOne(buf: Buffer, name: string): Promise<SelfieCheck> {
  try {
    const meta = await sharp(buf).rotate().metadata();
    if (!meta.width || !meta.height) return { name, ok: false, reason: "unreadable image" };
    if (Math.min(meta.width, meta.height) < MIN_DIM)
      return { name, ok: false, reason: `too small (min ${MIN_DIM}px)` };

    const { data, info } = await sharp(buf)
      .rotate()
      .resize(512, 512, { fit: "inside" })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width: w, height: h, channels: ch } = info;

    // mean brightness
    let sum = 0;
    for (let i = 0; i < data.length; i += ch) sum += data[i];
    const mean = sum / (data.length / ch);
    if (mean < DARK_MAX) return { name, ok: false, reason: "too dark" };
    if (mean > BRIGHT_MIN) return { name, ok: false, reason: "overexposed" };

    // sharpness = variance of the discrete Laplacian
    let lSum = 0;
    let lSq = 0;
    let n = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * ch;
        const lap =
          4 * data[i] - data[i - ch] - data[i + ch] - data[i - w * ch] - data[i + w * ch];
        lSum += lap;
        lSq += lap * lap;
        n++;
      }
    }
    const variance = lSq / n - (lSum / n) ** 2;
    if (variance < BLUR_MIN) return { name, ok: false, reason: "too blurry" };

    return { name, ok: true };
  } catch {
    return { name, ok: false, reason: "couldn't process image" };
  }
}

export interface ValidationSummary {
  checks: SelfieCheck[]; // aligned with the input order
  validCount: number;
}

/** Validate selfies; `checks[i]` corresponds to `files[i]`. */
export async function validateSelfies(
  files: { buffer: Buffer; name: string }[],
): Promise<ValidationSummary> {
  const checks = await Promise.all(files.map((f) => checkOne(f.buffer, f.name)));
  return { checks, validCount: checks.filter((c) => c.ok).length };
}

/** A short human summary of why photos were rejected, e.g. "3 too blurry, 1 too dark". */
export function summarizeRejections(checks: SelfieCheck[]): string {
  const counts = new Map<string, number>();
  for (const c of checks) {
    if (c.ok || !c.reason) continue;
    counts.set(c.reason, (counts.get(c.reason) ?? 0) + 1);
  }
  return [...counts.entries()].map(([reason, n]) => `${n} ${reason}`).join(", ");
}
