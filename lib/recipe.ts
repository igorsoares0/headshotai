/**
 * The generation "recipe" — a versioned bundle of model + prompt + params
 * (reqs §13). Validated end-to-end on a 20-image run: all passed the 0.65
 * ArcFace identity gate, a different-person control scored 0.45.
 */
export const RECIPE_VERSION = "v1";

// Replicate models (pinned versions — reqs §33)
export const TRAINER = "ostris/flux-dev-lora-trainer";
export const TRAINER_VERSION =
  "26dce37af90b9d997eeb970d92e47de3064d46c300504ae376c75bef6a9022d2";
export const FACEMATCH_VERSION =
  "83e4bb4ade81e81bbaaf8d7b33db30b93688407c2c2d2d1010a0bff378e62a3a";

// Destination model that trained LoRA weights are pushed to (per-user in prod;
// one shared model here, distinguished by version)
export const MODEL_OWNER = "igorsoares0";
export const MODEL_NAME = "aperture-identity";

// Training config
export const TRIGGER = "TOK";
export const TRAIN_STEPS = 1000;
export const LORA_RANK = 16;

// Quality gating (reqs §3 / §16)
export const GATE = 0.65; // ArcFace similarity floor
export const REFERENCE_COUNT = 2; // selfies each output is compared against (max wins)

// Delivery-by-count (reqs §15/§16): a pack promises N delivered photos. We
// over-generate by a small margin (the spike measured ~100% identity pass, so a
// big 3-4× ratio would just burn money), gate on identity, then rank survivors
// by similarity and deliver the top N. A top-up round tops the pool up if a
// batch under-delivers, bounded by a hard per-order image cap (cost cap, §4).
export const OVERGEN_MARGIN = 1.4;
export const MAX_GEN_PER_ORDER = 140; // ceil(80 * 1.4) = 112, with headroom for top-up

/** Total images to generate for an initial batch targeting `count` deliveries. */
export function initialGenCount(count: number): number {
  return Math.min(Math.ceil(count * OVERGEN_MARGIN), MAX_GEN_PER_ORDER);
}

/** Spread `total` images across the styles as evenly as possible. */
export function distribute(total: number): Record<StyleKey, number> {
  const base = Math.floor(total / STYLE_KEYS.length);
  let rem = total - base * STYLE_KEYS.length;
  const out = {} as Record<StyleKey, number>;
  for (const k of STYLE_KEYS) out[k] = base + (rem-- > 0 ? 1 : 0);
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

export type StyleKey = "corporate" | "linkedin" | "bw_dramatic" | "outdoor";

export const STYLES: Record<StyleKey, { label: string; prompt: string }> = {
  corporate: {
    label: "Corporate",
    prompt:
      `professional corporate headshot photo of ${TRIGGER}, a person wearing a ` +
      "tailored navy business suit and white shirt, soft studio lighting, clean " +
      "neutral gray background, shallow depth of field, sharp focus on eyes, " +
      "looking at camera, 85mm portrait, photorealistic",
  },
  linkedin: {
    label: "LinkedIn",
    prompt:
      `professional LinkedIn headshot of ${TRIGGER}, a person in a smart casual ` +
      "collared shirt, bright modern office blurred in the background, natural " +
      "window light, confident friendly expression, high detail, photorealistic",
  },
  bw_dramatic: {
    label: "B&W Editorial",
    prompt:
      `dramatic black and white editorial portrait of ${TRIGGER}, a person, soft ` +
      "key light with gentle Rembrandt shadow, balanced exposure, face clearly lit " +
      "and visible, elegant high-key background, cinematic, subtle film grain, " +
      "looking into camera, photorealistic",
  },
  outdoor: {
    label: "Outdoor",
    prompt:
      `outdoor environmental portrait of ${TRIGGER}, a person in a light linen ` +
      "shirt, golden hour backlight, blurred city street background, candid " +
      "natural expression, 35mm, photorealistic",
  },
};

export const STYLE_KEYS = Object.keys(STYLES) as StyleKey[];

// Rough Replicate H100 pricing for cost estimates ($/sec)
export const H100_PER_SEC = 0.001525;
