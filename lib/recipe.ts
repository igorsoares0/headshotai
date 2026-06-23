/**
 * The generation "recipe" — a versioned bundle of model + prompt + params
 * (reqs §13). Validated end-to-end on a 20-image run: all passed the ArcFace
 * identity gate, a different-person control scored 0.45.
 *
 * v2: prompts now anchor the subject's gender (and optional ethnicity) instead
 * of the neutral "a person". With only the trigger word, an underfit LoRA lets
 * FLUX's own prior fill demographic gaps — causing gender/ethnicity drift. The
 * descriptor (see describeSubject) closes that gap. The identity gate floor was
 * also raised 0.65 → 0.70 to reject drift that still slips through.
 */
export const RECIPE_VERSION = "v2";

// Replicate models (pinned versions — reqs §33)
export const TRAINER = "ostris/flux-dev-lora-trainer";
export const TRAINER_VERSION =
  "26dce37af90b9d997eeb970d92e47de3064d46c300504ae376c75bef6a9022d2";
export const FACEMATCH_VERSION =
  "83e4bb4ade81e81bbaaf8d7b33db30b93688407c2c2d2d1010a0bff378e62a3a";
// Upscaler (reqs §17): Real-ESRGAN + GFPGAN face enhancement. Chosen over a
// creative img2img upscaler (e.g. clarity) because it's a deterministic detail
// pass — it sharpens skin/eyes without re-imagining the face, so it can't undo
// the identity work upstream. Run only on delivered (top-N) images to save cost.
export const UPSCALER_VERSION =
  "b3ef194191d13140337468c916c2c5b96dd0cb06dffc032a022a31807f6a5ea8";
export const UPSCALE_SCALE = 2; // 1024 → ~2K (reqs §17 default; 4K is a paid tier)
// Aesthetic scorer (reqs §16 stage 2): img2aestheticscore returns a 1-10 number.
export const AESTHETIC_VERSION =
  "ec5029694b29e51fa9e5b794d73ba8103569d5d3ef3d60b7a8fdef18b9997b90";
// Content safety (reqs §30): falcons-ai NSFW ViT returns the class as a string.
export const NSFW_VERSION =
  "97116600cabd3037e5f22ca08ffcc33b92cfacebf7ccd3609e9c1d29e43d3a8d";

// Destination model that trained LoRA weights are pushed to (per-user in prod;
// one shared model here, distinguished by version)
export const MODEL_OWNER = "igorsoares0";
export const MODEL_NAME = "aperture-identity";

// Training config
export const TRIGGER = "TOK";
export const TRAIN_STEPS = 1000;
export const LORA_RANK = 16;

// Quality gating (reqs §3 / §16)
export const GATE = 0.7; // ArcFace similarity floor (v2: raised from 0.65)
export const REFERENCE_COUNT = 2; // selfies each output is compared against (max wins)

// Stage-2 ranking (reqs §16): identity stays primary; aesthetics curates within
// the survivors and breaks ties. rankScore = (1-W)·similarity + W·(aesthetic/10).
export const AESTHETIC_WEIGHT = 0.35;
// Two delivered shots whose 64-bit average-hash differ by ≤ this many bits are
// near-duplicate poses; we keep the higher-ranked one (reqs §16, dedupe).
export const DEDUPE_HAMMING = 6;

// Delivery-by-count (reqs §15/§16): a pack promises N delivered photos. Identity
// pass is ~100% (the spike), so 1.4× would already cover throughput — but stage-2
// curation (aesthetics + dedupe) needs a real pool to pick from, so we over-
// generate 2× and deliver the best N. Generation is cheap (~1¢/image; training
// dominates cost), so the extra pool is nearly free quality. A top-up round tops
// the pool up if a batch under-delivers, bounded by a hard per-order cap (§4).
export const OVERGEN_MARGIN = 2.0;
export const MAX_GEN_PER_ORDER = 200; // ceil(80 * 2.0) = 160, with headroom for top-up

/** Total images to generate for an initial batch targeting `count` deliveries. */
export function initialGenCount(count: number): number {
  return Math.min(Math.ceil(count * OVERGEN_MARGIN), MAX_GEN_PER_ORDER);
}

/** Spread `total` images across the given style keys as evenly as possible. */
export function distribute(total: number, keys: string[]): Record<string, number> {
  const base = Math.floor(total / keys.length);
  let rem = total - base * keys.length;
  const out: Record<string, number> = {};
  for (const k of keys) out[k] = base + (rem-- > 0 ? 1 : 0);
  return out;
}

// Shared generation params
export const GEN_BASE = {
  model: "dev",
  num_inference_steps: 28,
  guidance_scale: 3.0,
  lora_scale: 1.0,
  aspect_ratio: "4:5",
  output_format: "jpg",
  output_quality: 95,
} as const;

// --- Subject descriptor (reqs §12/§14) ------------------------------------
// Anchors who the photo is of. Collected at order time and interpolated into
// every prompt so FLUX doesn't fill demographic gaps from its own prior.

export type Gender = "man" | "woman" | "person";
export const GENDERS: { value: Gender; label: string }[] = [
  { value: "man", label: "Man" },
  { value: "woman", label: "Woman" },
  { value: "person", label: "Non-binary / prefer not to say" },
];

// Each value IS the prompt adjective; an empty value means "no anchor".
export const ETHNICITIES: { value: string; label: string }[] = [
  { value: "", label: "Prefer not to say" },
  { value: "Latino", label: "Latino / Hispanic" },
  { value: "White", label: "White / Caucasian" },
  { value: "Black", label: "Black / African" },
  { value: "Middle Eastern", label: "Middle Eastern" },
  { value: "South Asian", label: "South Asian" },
  { value: "East Asian", label: "East Asian" },
  { value: "Southeast Asian", label: "Southeast Asian" },
  { value: "Indigenous", label: "Indigenous" },
];

/** Build the noun phrase that replaces "a person" in prompts, e.g. "Latino man". */
export function describeSubject(gender: string, ethnicity?: string): string {
  const g: Gender = gender === "man" || gender === "woman" ? gender : "person";
  const e = ethnicity?.trim();
  const valid = e && ETHNICITIES.some((x) => x.value === e);
  return valid ? `${e} ${g}` : g;
}

export type StyleKey = string; // a composed look key, e.g. "gray_navysuit"

// A "look" is composed from a background (setting + lighting) and an outfit
// (reqs §13: a template is a full parameter set, not a one-off prompt). The
// catalog is BACKGROUNDS × OUTFITS, so it scales to many looks without anyone
// hand-writing prompts. Both halves are spliced into one shared, conservative
// portrait template — the formula that produced the good Corporate/LinkedIn
// results — so every combination behaves predictably.
interface Fragment {
  id: string;
  label: string;
  prompt: string; // fragment spliced into the portrait template
}

export const BACKGROUNDS: Fragment[] = [
  { id: "gray", label: "Gray studio", prompt: "soft studio lighting, a clean neutral gray background" },
  { id: "white", label: "White studio", prompt: "soft studio lighting, a bright seamless white background" },
  { id: "office", label: "Office", prompt: "natural window light, a modern office softly blurred behind" },
  { id: "park", label: "Outdoor", prompt: "soft natural daylight on the face, a softly blurred green park behind" },
];

export const OUTFITS: Fragment[] = [
  { id: "navysuit", label: "Navy suit", prompt: "wearing a tailored navy business suit and a white shirt" },
  { id: "blazer", label: "Blazer", prompt: "wearing a smart charcoal blazer over a crew-neck top" },
  { id: "shirt", label: "Collared shirt", prompt: "wearing a smart casual collared shirt" },
];

/** Most looks a user can pick per order — overgen is split across the picks. */
export const MAX_LOOKS = 4;

interface Style {
  label: string;
  prompt: (subject: string) => string;
  params?: Record<string, string | number>;
}

function composeLook(bg: Fragment, outfit: Fragment): Style {
  return {
    label: `${outfit.label} · ${bg.label}`,
    prompt: (s) =>
      `professional headshot photo of ${TRIGGER}, a ${s} ${outfit.prompt}, ${bg.prompt}, ` +
      "shallow depth of field, sharp focus on the eyes, looking at camera, 85mm portrait, " +
      "natural skin texture, high detail, photorealistic",
  };
}

// Catalog keyed by `${backgroundId}_${outfitId}` (BACKGROUNDS × OUTFITS).
export const STYLES: Record<StyleKey, Style> = Object.fromEntries(
  BACKGROUNDS.flatMap((bg) =>
    OUTFITS.map((o) => [`${bg.id}_${o.id}`, composeLook(bg, o)] as [string, Style]),
  ),
);

export const STYLE_KEYS = Object.keys(STYLES);

// Rough Replicate H100 pricing for cost estimates ($/sec)
export const H100_PER_SEC = 0.001525;
