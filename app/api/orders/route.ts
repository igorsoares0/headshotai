import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { startOrder, type UploadInput } from "@/lib/pipeline";
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

  // Reserve the purchase before doing any (paid) work so concurrent requests
  // can't spend it twice. Released back to the user if creation fails.
  const reserved = await consumePurchase(purchase.id);
  if (!reserved) {
    return Response.json({ error: "No active pack. Buy one to continue." }, { status: 402 });
  }

  try {
    const inputs: UploadInput[] = await Promise.all(
      files.map(async (f) => ({
        buffer: Buffer.from(await f.arrayBuffer()),
        name: f.name,
        type: f.type,
      })),
    );
    const order = await startOrder(inputs, purchase.packId, session.user.id, purchase.photoCount);
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
