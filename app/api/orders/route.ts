import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startOrder, type UploadInput } from "@/lib/pipeline";
import { describeSubject, GENDERS, MAX_LOOKS, STYLE_KEYS } from "@/lib/recipe";
import { summarizeRejections, validateSelfies } from "@/lib/validate";
import { listOrders } from "@/lib/store";
import {
  consumePurchase,
  getActivePurchase,
  linkPurchaseOrder,
  releasePurchase,
} from "@/lib/entitlement";

export const runtime = "nodejs"; // needs fs + sharp

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await listOrders(session.user.id));
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

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

  if (files.length < 10) {
    return Response.json({ error: "Upload at least 10 photos." }, { status: 400 });
  }
  if (files.length > 25) {
    return Response.json({ error: "Upload at most 25 photos." }, { status: 400 });
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
