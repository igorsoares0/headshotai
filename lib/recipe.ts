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
export const OVERGEN = 3; // images generated per style; gate trims down (§15)
export const REFERENCE_COUNT = 2; // selfies each output is compared against (max wins)

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
      `dramatic black and white portrait of ${TRIGGER}, a person, strong side ` +
      "Rembrandt lighting with deep shadows, high contrast, moody, cinematic, " +
      "film grain, looking into camera, photorealistic",
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
