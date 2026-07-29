import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startOrder, type UploadInput } from "@/lib/pipeline";
import {
  describeSubject,
  GENDERS,
  MAX_LOOKS,
  MAX_UPLOADS,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_TOTAL_BYTES,
  MIN_UPLOADS,
  STYLE_KEYS,
} from "@/lib/recipe";
import { summarizeRejections, validateSelfies } from "@/lib/validate";
import { listOrders } from "@/lib/store";
import { toClientOrder } from "@/lib/view";
import {
  consumePurchase,
  getActivePurchase,
  linkPurchaseOrder,
  releasePurchase,
} from "@/lib/entitlement";

export const runtime = "nodejs"; // needs sharp

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const orders = await listOrders(session.user.id);
  return Response.json(await Promise.all(orders.map(toClientOrder)));
}

/** Human-readable megabytes for error copy, e.g. 15728640 → "15MB". */
const mb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))}MB`;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Reject an oversized body from its declared length BEFORE request.formData()
  // parses (and buffers) it. The per-file checks below are the real enforcement —
  // this is just the cheap first line, since Content-Length is client-supplied and
  // absent under chunked encoding. A reverse-proxy body limit backs both up.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_TOTAL_BYTES) {
    return Response.json(
      { error: `That upload is too large (max ${mb(MAX_UPLOAD_TOTAL_BYTES)} total).` },
      { status: 413 },
    );
  }

  // Gate the paid action on a confirmed email — unverified accounts can sign in
  // and browse, but can't spend a pack.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
  });
  if (!user?.emailVerified) {
    return Response.json({ error: "Verify your email to start generating." }, { status: 403 });
  }

  // Pay-first: a paid, unconsumed purchase is required to start a batch (§8).
  const purchase = await getActivePurchase(session.user.id);
  if (!purchase) {
    return Response.json({ error: "No active pack. Buy one to continue." }, { status: 402 });
  }

  const form = await request.formData();
  const files = form.getAll("photos").filter((f): f is File => f instanceof File);

  if (files.length < MIN_UPLOADS) {
    return Response.json({ error: `Upload at least ${MIN_UPLOADS} photos.` }, { status: 400 });
  }
  if (files.length > MAX_UPLOADS) {
    return Response.json({ error: `Upload at most ${MAX_UPLOADS} photos.` }, { status: 400 });
  }

  // Size guard, on File.size — known without touching the bytes. The client
  // enforces the same per-file cap, but that's trivially bypassed, and below we
  // hold every photo in memory at once (buffer → sharp → zip).
  const oversized = files.find((f) => f.size > MAX_UPLOAD_BYTES);
  if (oversized) {
    return Response.json(
      { error: `"${oversized.name}" is larger than ${mb(MAX_UPLOAD_BYTES)}. Use smaller photos.` },
      { status: 413 },
    );
  }
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  if (totalBytes > MAX_UPLOAD_TOTAL_BYTES) {
    return Response.json(
      { error: `Those photos total ${mb(totalBytes)} — the limit is ${mb(MAX_UPLOAD_TOTAL_BYTES)}.` },
      { status: 413 },
    );
  }

  // Only real images get past here: sharp would reject the rest downstream, but
  // that's after we've buffered them.
  const nonImage = files.find((f) => !f.type.startsWith("image/"));
  if (nonImage) {
    return Response.json(
      { error: `"${nonImage.name}" isn't an image.` },
      { status: 400 },
    );
  }

  // Subject descriptor anchors gender/ethnicity in the prompt (reqs §12/§14) so
  // FLUX doesn't drift. Gender is required; ethnicity is optional.
  const gender = String(form.get("gender") ?? "");
  if (!GENDERS.some((g) => g.value === gender)) {
    return Response.json({ error: "Select who these photos are of." }, { status: 400 });
  }
  const subject = describeSubject(gender, String(form.get("ethnicity") ?? ""));

  // Looks the user picked (reqs §13). Keep only known catalog keys, dedupe, and
  // cap at MAX_LOOKS; overgen is split across these.
  const looks = [...new Set(form.getAll("looks").map(String))]
    .filter((k) => STYLE_KEYS.includes(k))
    .slice(0, MAX_LOOKS);
  if (looks.length === 0) {
    return Response.json({ error: "Pick at least one look." }, { status: 400 });
  }

  // Validate selfies BEFORE consuming the pack — a bad upload shouldn't cost a
  // training run (reqs §9/§10). We train only on the photos that pass.
  const inputs: UploadInput[] = await Promise.all(
    files.map(async (f) => ({
      buffer: Buffer.from(await f.arrayBuffer()),
      name: f.name,
      type: f.type,
    })),
  );
  const { checks, validCount } = await validateSelfies(inputs);
  if (validCount < 10) {
    const why = summarizeRejections(checks);
    return Response.json(
      {
        error: `Only ${validCount} of ${inputs.length} photos are usable${why ? ` (${why})` : ""}. Add at least 10 clear, well-lit photos.`,
      },
      { status: 400 },
    );
  }
  const usable = inputs.filter((_, i) => checks[i].ok);

  // Reserve the purchase before doing any (paid) work so concurrent requests
  // can't spend it twice. Released back to the user if creation fails.
  const reserved = await consumePurchase(purchase.id);
  if (!reserved) {
    return Response.json({ error: "No active pack. Buy one to continue." }, { status: 402 });
  }

  try {
    const order = await startOrder(
      usable,
      purchase.packId,
      session.user.id,
      purchase.photoCount,
      subject,
      looks,
    );
    await linkPurchaseOrder(purchase.id, order.id);
    return Response.json({ id: order.id }, { status: 201 });
  } catch (e) {
    await releasePurchase(purchase.id);
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to start order" },
      { status: 500 },
    );
  }
}
