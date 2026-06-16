# HEADSHOTPRO_SDD.md

# AI Professional Headshots Platform

## Spec-Driven Development

Version: 1.1

---

## Changelog — 1.0 → 1.1

* Added quantitative **Success Criteria & KPIs** (§3) and **Non-Functional Requirements** (§4) — the spec is now measurable.
* Reworked the generation core: **Dataset Preparation** (§11), trigger-word/captioning strategy in **Identity Training** (§12), corrected **Prompt System** conceptual error (§14), defined the **over-generation ratio** (§15), and turned identity into a hard **gate** in **Quality Gating & Ranking** (§16).
* Redefined **AI Templates** as full parameter sets, not just prompts (§13).
* Added **Identity Method Strategy** (LoRA vs. instant/few-shot, hybrid) (§18).
* Promoted persistent identity model from "future" to core.
* Added an explicit **Credit Model** (§8) and reconciled it with packages.
* Defined **Order lifecycle, failure & retry semantics** (§20).
* Hardened **Security, Privacy & Compliance** for biometric data (§29) and added **Content Safety & Misuse Prevention** (§30) and **Observability & Cost Controls** (§31).
* Expanded **Database Models** with concrete fields and a `Package` model (§27).
* Added **Model & Config Versioning** (§33).

---

# 1. Product Vision

Build a SaaS platform that generates professional studio-quality headshots from user selfies using AI.

The platform should provide an experience comparable to industry leaders such as HeadshotPro and BetterPic while maintaining a simple workflow:

1. Upload selfies
2. Automatic validation
3. Purchase package
4. AI training
5. Headshot generation
6. Gallery delivery
7. Download and favorites

The primary goal is **maximizing facial identity consistency** and customer satisfaction. Every requirement below is subordinate to a measurable identity-consistency target (§3).

---

# 2. Goals

## Business Goals

* Sell AI headshot packages
* Support one-time purchases
* Support future subscription plans
* Enable repeat generations after initial training **without retraining** (persistent identity model — core, not future)
* Keep AI cost per delivered headshot below a defined ceiling (§3, §31)

## User Goals

* Obtain professional headshots without a photographer
* Receive results quickly
* Maintain facial similarity
* Download high-resolution images

---

# 3. Success Criteria & KPIs

The product is considered functional only when it meets these measurable targets. Default thresholds are starting points to be tuned during the validation spike.

## Quality (the core)

* **Identity similarity:** mean cosine similarity ≥ **0.65** (ArcFace/InsightFace embedding) between each delivered headshot and the user's input selfies.
* **Identity gate pass rate:** ≥ **80%** of generated candidates pass the identity threshold (§16).
* **Deliverable yield:** ≥ the package's promised headshot count survives gating after over-generation.
* **Artifact rate:** ≤ **5%** of delivered images contain visible face artifacts (extra fingers, melted features, wrong eye count).

## Funnel

* Upload completion rate, checkout conversion, training success rate, generation success rate, download rate, repeat-generation rate (tracked per §32).

## Economics

* **Cost per delivered headshot** ≤ target ceiling (set during spike).
* **Cost per order** = fixed training cost + (over-generation ratio × per-image inference cost) + upscaling. Must be defined and monitored (§31).

---

# 4. Non-Functional Requirements

* **Latency:** training + first generation batch completes in p50 ≤ 30 min, p95 ≤ 60 min.
* **Concurrency:** support N concurrent trainings and M concurrent generation jobs without queue starvation (capacity-plan via Inngest concurrency limits).
* **Reliability:** every long-running step (validation, training, generation, ranking, upscaling) is **idempotent and retry-safe**.
* **Reproducibility:** any delivered image can be regenerated from stored job params (model version, seed, template version, LoRA version) — see §33.
* **Cost ceiling:** a hard per-order spend cap aborts and flags the order rather than overspending.

---

# 5. Tech Stack

## Frontend

* Next.js 15
* TypeScript
* TailwindCSS
* shadcn/ui
* Zustand
* React Hook Form
* Zod

## Backend

* Next.js Route Handlers
* Server Actions

## Authentication

* Auth.js

## Database

* PostgreSQL

## ORM

* Prisma

## Storage

* Cloudflare R2

## Billing

* Paddle

## Queue

* Inngest

## AI Provider

* Fal.ai (primary). The pipeline must be **provider-abstracted** so an alternate provider (e.g. Replicate) can be swapped behind an interface for validation and redundancy.

## Hosting

* Vercel

---

# 6. Core User Flow

## Initial Flow

Landing Page
→ Sign Up
→ Upload Selfies
→ Validation
→ Select Package
→ Checkout
→ Training
→ Generation
→ Gallery
→ Download

---

# 7. User Roles

## Customer

Can:

* Upload photos
* Purchase packages
* Generate headshots
* Download images
* Manage profile

## Admin

Can:

* View users
* View orders
* View AI jobs
* Manage templates
* Manage packages
* Review failures

---

# 8. Packages & Credit Model

## Packages

### Starter

* 40 headshots
* 10 styles

### Professional

* 120 headshots
* 30 styles

### Executive

* 300 headshots
* 50 styles

## Credit Model

* A purchase grants **credits**; **1 credit = 1 delivered headshot**.
* Credits are tracked in a **credit ledger** (append-only) so balance is auditable: purchases add, deliveries subtract, refunds re-add.
* The "headshots" count in a package equals the credits granted.
* Over-generated candidates that fail gating do **not** consume credits — only delivered images do.
* Packages are stored as a `Package` DB model (§27), not hardcoded, so pricing/contents can change without a deploy.

---

# 9. Selfie Upload Requirements

Minimum:

* 10 photos

Recommended:

* 15 photos

Maximum:

* 25 photos

Accepted:

* JPG
* JPEG
* PNG

Maximum size:

* 15MB each

Uploads use **signed URLs** directly to R2; the app never proxies raw image bytes.

---

# 10. Photo Validation

Every uploaded image must pass validation before it can enter a dataset.

## Face Detection

Requirements:

* Exactly one face

Reject:

* Multiple faces
* No face

## Resolution Check

Minimum:

* 1024px on the shorter edge

## Blur Detection

Reject blurry images (variance-of-Laplacian below threshold).

## Similarity Detection

Reject near-duplicate photos (perceptual hash / embedding distance below threshold) to avoid overfitting the dataset.

## Occlusion Detection

Reject:

* Sunglasses
* Face masks
* Heavy face obstruction

## Output

Each upload records a `validationStatus` and a machine-readable `validationReason` for rejected images, surfaced to the user.

---

# 11. Dataset Preparation

The quality ceiling of the whole product is set here. "Dataset Creation" is not a black box.

## Steps

Validated Photos
→ Face crop & center (consistent framing around the detected face)
→ Angle/expression balancing (avoid a dataset of identical frontal shots)
→ Auto-captioning (each image captioned with a consistent trigger + class word, e.g. `a photo of TOK man`)
→ Resize/normalize to the trainer's expected resolution
→ Package as training dataset (zip/manifest)

## Requirements

* Minimum **valid** images after preparation: 10 (ideal 15–25).
* Captioning strategy (trigger word, class word, caption template) is **versioned config**, not hardcoded — it is the single highest-leverage lever on identity (§33).

---

# 12. Identity Training

## Purpose

Create a personalized, **persistent** AI identity model the user can reuse for future generations without retraining.

## Flow

Prepared Dataset
→ LoRA Training (on the configured base model)
→ Identity self-check (validate the trained model reproduces the user's face)
→ Model Storage

## Output

* One **persistent** LoRA model per user, stored in R2.
* Recorded with: `triggerWord`, `classWord`, `baseModel`, `baseModelVersion`, training params (steps, LR, rank), and `version`.

## Notes

* The trigger word/class word chosen during dataset prep (§11) is what the prompts reference at generation time — **not** a literal substitution of the model into the prompt (see §14).
* Retraining is explicit and re-versions the model; routine repeat generations reuse the existing model (margin engine).

---

# 13. AI Templates

A template is **not** just a prompt — it is a full, versioned generation recipe.

## A template defines

* Positive prompt (with `[TRIGGER]` / `[CLASS]` placeholders)
* Negative prompt
* LoRA strength / scale
* Steps, guidance scale, sampler/scheduler
* Base model + version
* Target aspect ratio / resolution
* Category

Templates are versioned (§33); changing a template creates a new version so past results stay reproducible.

## Categories

### Corporate

* Executive
* CEO
* Finance

### Technology

* Software Engineer
* Startup Founder
* Product Manager

### Healthcare

* Doctor
* Dentist
* Therapist

### Legal

* Lawyer
* Attorney

### Sales

* Realtor
* Consultant

### Personal Brand

* Creator
* Coach
* Speaker

---

# 14. Prompt System

Templates are parameterized recipes (§13). At generation time:

1. The user's LoRA **weights are loaded** into the base model.
2. The template's prompt is rendered, substituting the placeholders with the user's **trigger word** and **class word** (e.g. `TOK`, `man`).

Example rendered prompt:

```
Professional corporate headshot of TOK man,
business suit,
modern office background,
85mm lens,
high-end photography,
linkedin profile picture
```

> Correction vs. 1.0: the LoRA is loaded as model weights; the prompt references the **trigger token** it was trained on. The model is never "substituted into" the prompt text.

---

# 15. Generation Pipeline

## Workflow

User Selects Templates
→ Create Generation Job (snapshot of template version + model version + seeds)
→ Queue
→ Generate **N candidates per delivered slot** (over-generation)
→ Identity Gate + Quality Ranking (§16)
→ Upscale survivors
→ Store Results

## Over-Generation Ratio

* Define `overgenFactor` (default **3–4×** per delivered headshot) as tunable config.
* `overgenFactor` directly drives cost (§3, §31); it is monitored and adjusted to balance yield vs. spend.
* Seeds, guidance, and LoRA strength may be varied across candidates to increase diversity and gate pass rate.

---

# 16. Quality Gating & Ranking

Gating happens in two stages: a hard **gate** (pass/fail) then a soft **rank**.

## Stage 1 — Identity Gate (hard)

* Compute face embedding of each candidate; reject any below the identity similarity threshold (§3).
* This is the primary guarantee of the product's core promise. Candidates that fail are discarded and never delivered.

## Stage 2 — Quality Ranking (soft)

Surviving candidates are scored and the top ones (up to the credit/slot count) are delivered. Prioritized metrics:

* **Identity consistency** (also used as the gate)
* **Face/eye quality & artifact detection**
* **Sharpness**

Secondary / best-effort:

* Prompt adherence
* Aesthetic score

> Rationale: identity + face-quality/artifact filtering deliver the 80/20. The softer scores are added incrementally and must justify their cost before becoming gating criteria.

---

# 17. Upscaling

Delivered images are upscaled before delivery.

Target:

* 2048x2048

Optional (paid tiers):

* 4096x4096

---

# 18. Identity Method Strategy

The platform should not hard-commit to a single identity approach. Two are evaluated and may be combined:

## Trained LoRA (default, paid)

* Highest identity fidelity.
* Fixed training cost per user; cheap repeat generation thereafter (persistent model).

## Instant / few-shot identity (optional)

* IP-Adapter FaceID / InstantID / PuLID-style methods: 1–3 photos, no per-user training.
* Lower fidelity, near-zero marginal cost, instant.

## Hybrid recommendation

* Use **instant** for free previews / fast low-cost paths and **trained LoRA** for paid delivery.
* The validation spike must measure identity similarity and cost for **both** before locking the architecture.

---

# 19. Dashboard

## Navigation

Dashboard

Orders

Gallery

Favorites

Billing

Profile

---

# 20. Order States & Lifecycle

## States

PENDING_UPLOAD
VALIDATING
AWAITING_PAYMENT
TRAINING
GENERATING
UPSCALING
READY
FAILED

## Failure & Retry Semantics

* Each state transition is logged with a timestamp and reason.
* **FAILED** is entered when a step exhausts its retries or hits the per-order cost cap (§4).
* A retry resumes from the **last successful step** (e.g. re-generate without re-training) to avoid paying the training cost again unless the model itself failed.
* Refund policy: if an order cannot reach READY, undelivered credits are refunded to the ledger (§8) and the user is notified (§24).
* All transitions are **idempotent** so duplicate job executions cannot double-charge credits or double-train.

---

# 21. Gallery Features

## Actions

Favorite

Download

Delete

Regenerate

Compare

## Filters

Template

Date

Favorites

Package

---

# 22. Favorites System

Users can bookmark generated images.

Favorites appear in a dedicated section.

---

# 23. Billing & Credits

## Paddle Checkout

Flow:

Select Package
→ Paddle Checkout
→ Webhook
→ Credit Grant + Order Activation (§8)

## Required Webhooks

transaction.completed

subscription.created

subscription.updated

subscription.canceled

## Correctness

* Webhooks are **signature-verified** and **idempotent** (dedupe by event id) — replays must not double-grant credits.
* Credit grants are written to the ledger (§8) inside the same transaction that activates the order.

---

# 24. Email Notifications

## Events

Order Confirmed

Training Started

Training Completed

Generation Started

Headshots Ready

Generation Failed (with refund/next-steps)

---

# 25. Background Jobs

Managed through Inngest. Every job is **idempotent** (safe to re-run) and keyed so duplicate triggers are deduplicated.

## Jobs

Photo Validation

Dataset Preparation

LoRA Training

Headshot Generation

Quality Gating & Ranking

Upscaling

Email Notifications

Cleanup

---

# 26. Storage Structure

/uploads

/datasets

/loras

/generated

/upscaled

/thumbnails

All access is via signed, time-limited URLs (§29).

---

# 27. Database Models

> Fields below are the concrete minimum; timestamps (`createdAt`/`updatedAt`) implied on all.

## User

* id
* email
* name
* image
* role (CUSTOMER | ADMIN)

## Package

* id
* name
* priceCents
* currency
* credits (= headshots)
* styleCount
* active

## Order

* id
* userId
* packageId
* status (§20)
* amountCents
* currency
* creditsGranted
* paddleTransactionId

## CreditLedgerEntry

* id
* userId
* orderId
* delta (+/-)
* reason (PURCHASE | DELIVERY | REFUND)

## Upload

* id
* userId
* fileUrl
* validationStatus
* validationReason

## Dataset

* id
* userId
* imageCount
* captionConfigVersion

## LoRAModel

* id
* userId
* modelUrl
* triggerWord
* classWord
* baseModel
* baseModelVersion
* trainingParams (json)
* version
* status

## Template

* id
* name
* category
* version
* prompt
* negativePrompt
* loraStrength
* steps
* guidance
* sampler
* baseModel
* aspectRatio

## GenerationJob

* id
* userId
* templateId
* templateVersion
* loraModelId
* status
* progress
* overgenFactor
* seed
* costCents

## GeneratedImage

* id
* jobId
* templateId
* imageUrl
* thumbnailUrl
* upscaledUrl
* identitySimilarity
* scores (json: sharpness, faceQuality, aesthetic, promptAdherence)
* gatePassed
* delivered

## Favorite

* id
* userId
* imageId

---

# 28. Admin Panel

## Users

Search

View Orders

Suspend Account

## Orders

View Status

Retry Failed Jobs (resumes from last successful step, §20)

## Templates

Create

Edit (creates new version)

Delete

## Packages

Create

Edit

Deactivate

## AI Jobs

Training Queue

Generation Queue

Failures

Per-job cost & identity-score review

---

# 29. Security, Privacy & Compliance

## Access & transport

* Signed upload URLs
* Protected downloads (time-limited signed URLs)
* Auth.js session validation
* Rate limiting
* Webhook signature validation (§23)
* Secure, scoped file access

## Biometric data (faces are special-category data)

* **Explicit consent** captured at upload for processing biometric data (GDPR Art. 9 / BIPA-style).
* **Retention policy:** raw selfies and datasets auto-deleted after a defined window; user can delete on demand.
* **Deletion SLA:** account/model deletion removes selfies, datasets, LoRA, and generated images within a defined SLA.
* Per-user LoRA is **never** used to train shared/global models.

---

# 30. Content Safety & Misuse Prevention

* **Identity ownership consent:** user attests the uploaded face is their own (anti-impersonation / deepfake).
* **Output safety filter:** NSFW/unsafe outputs are filtered before delivery.
* **Abuse handling:** flagged accounts can be suspended; admin review queue for reported content.
* **Bias awareness:** class-word selection and template tuning are validated across skin tones and genders to avoid known failure modes; track quality gate pass rate by cohort.

---

# 31. Observability & Cost Controls

* Per-step and per-order **cost tracking** (training, inference × overgenFactor, upscaling).
* **Hard per-order spend cap** (§4) that aborts and flags rather than overspending.
* Dashboards/alerts for: identity gate pass rate, deliverable yield, cost per delivered headshot, queue depth, failure rate.
* Structured logs linking every GeneratedImage back to its job params for reproducibility.

---

# 32. Analytics

Track:

* Upload completion rate
* Checkout conversion
* Training success rate
* Generation success rate
* Identity gate pass rate
* Download rate
* Repeat generation rate
* Cost per delivered headshot

---

# 33. Model & Config Versioning

Reproducibility is a requirement (§4), so the following are versioned and stored with each job/result:

* **Base model** + version (e.g. Flux variant)
* **LoRA model** version per user
* **Template** version (prompt + all params)
* **Caption/trigger config** version (§11)
* **Seed** per generated image

Changing any of these creates a new version; historical results remain regenerable.

---

# 34. Future Features

## AI Editing

Change clothing

Change background

Change expression

Change lighting

Without retraining.

## Team Packages

Multiple employees per order.

## Custom Templates

User-created styles.

## Subscription Plans

Monthly credit grants.

> Note: the **persistent AI identity profile** (formerly a "future feature" in 1.0) is now core — see §12.
