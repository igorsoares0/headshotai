# HEADSHOTPRO_SDD.md

# AI Professional Headshots Platform

## Spec-Driven Development

Version: 1.0

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

The primary goal is maximizing facial identity consistency and customer satisfaction.

---

# 2. Goals

## Business Goals

* Sell AI headshot packages
* Support one-time purchases
* Support future subscription plans
* Enable repeat generations after initial training
* Minimize AI generation costs

## User Goals

* Obtain professional headshots without a photographer
* Receive results quickly
* Maintain facial similarity
* Download high-resolution images

---

# 3. Tech Stack

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

* Fal.ai

## Hosting

* Vercel

---

# 4. Core User Flow

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

# 5. User Roles

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

# 6. Packages

## Starter

* 40 headshots
* 10 styles

## Professional

* 120 headshots
* 30 styles

## Executive

* 300 headshots
* 50 styles

---

# 7. Selfie Upload Requirements

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

---

# 8. Photo Validation

Every uploaded image must pass validation.

## Face Detection

Requirements:

* Exactly one face

Reject:

* Multiple faces
* No face

## Resolution Check

Minimum:

* 1024px

## Blur Detection

Reject blurry images.

## Similarity Detection

Reject near-duplicate photos.

## Occlusion Detection

Reject:

* Sunglasses
* Face masks
* Heavy face obstruction

---

# 9. Identity Training

## Purpose

Create a personalized AI identity model.

## Flow

Uploaded Photos
→ Dataset Creation
→ LoRA Training
→ Model Storage

## Output

One LoRA model per user.

Stored in R2.

---

# 10. AI Templates

Templates define professional scenarios.

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

# 11. Prompt System

Templates are prompt collections.

Example:

Professional corporate headshot of [PERSON],
business suit,
modern office background,
85mm lens,
high-end photography,
linkedin profile picture

[PERSON] is replaced by the user's LoRA.

---

# 12. Generation Pipeline

## Workflow

User Selects Templates
→ Create Generation Job
→ Queue
→ Generate Variations
→ Quality Ranking
→ Upscale
→ Store Results

---

# 13. Image Ranking

Generated images receive quality scores.

## Metrics

* Face quality
* Identity consistency
* Sharpness
* Eye quality
* Prompt adherence
* Aesthetic score

Only top-ranked images are delivered.

---

# 14. Upscaling

Generated images should be upscaled before delivery.

Target:

* 2048x2048

Optional:

* 4096x4096

---

# 15. Dashboard

## Navigation

Dashboard

Orders

Gallery

Favorites

Billing

Profile

---

# 16. Order States

PENDING_UPLOAD

VALIDATING

AWAITING_PAYMENT

TRAINING

GENERATING

UPSCALING

READY

FAILED

---

# 17. Gallery Features

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

# 18. Favorites System

Users can bookmark generated images.

Favorites appear in a dedicated section.

---

# 19. Billing

## Paddle Checkout

Flow:

Select Package
→ Paddle Checkout
→ Webhook
→ Order Activation

## Required Webhooks

transaction.completed

subscription.created

subscription.updated

subscription.canceled

---

# 20. Email Notifications

## Events

Order Confirmed

Training Started

Training Completed

Generation Started

Headshots Ready

Generation Failed

---

# 21. Background Jobs

Managed through Inngest.

## Jobs

Photo Validation

Dataset Creation

LoRA Training

Headshot Generation

Image Ranking

Upscaling

Email Notifications

Cleanup

---

# 22. Storage Structure

/uploads

/datasets

/loras

/generated

/upscaled

/thumbnails

---

# 23. Database Models

## User

* id
* email
* name
* image

## Order

* id
* userId
* packageId
* status

## Upload

* id
* userId
* fileUrl
* validationStatus

## Dataset

* id
* userId

## LoRAModel

* id
* userId
* modelUrl
* status

## Template

* id
* name
* category

## GenerationJob

* id
* userId
* templateId
* status
* progress

## GeneratedImage

* id
* jobId
* imageUrl
* thumbnailUrl
* score

## Favorite

* id
* userId
* imageId

---

# 24. Admin Panel

## Users

Search

View Orders

Suspend Account

## Orders

View Status

Retry Failed Jobs

## Templates

Create

Edit

Delete

## Packages

Create

Edit

Deactivate

## AI Jobs

Training Queue

Generation Queue

Failures

---

# 25. Security

* Signed upload URLs
* Protected downloads
* Auth.js session validation
* Rate limiting
* Webhook signature validation
* Secure file access

---

# 26. Analytics

Track:

* Upload completion rate
* Checkout conversion
* Training success rate
* Generation success rate
* Download rate
* Repeat generation rate

---

# 27. Future Features

## AI Profile

Persistent identity model.

Allows generating new headshots without retraining.

## Team Packages

Multiple employees per order.

## Custom Templates

User-created styles.

## Subscription Plans

Monthly generations.

## AI Editing

Change clothing

Change background

Change expression

Change lighting

Without retraining.
