import { advanceOrder } from "@/lib/pipeline";
import { getOrder } from "@/lib/store";
import { verifyWebhook } from "@/lib/replicate";

export const runtime = "nodejs";

/**
 * Replicate calls this when a training / generation / face-match prediction
 * completes (we attach `?` nothing — the order id is in the path). The handler
 * just wakes the state machine: advanceOrder polls the current phase and moves
 * the order forward. This is what lets an order finish even with the tab closed.
 */
export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const body = await request.text();

  const valid = await verifyWebhook(
    {
      id: request.headers.get("webhook-id"),
      timestamp: request.headers.get("webhook-timestamp"),
      signature: request.headers.get("webhook-signature"),
    },
    body,
  );
  if (!valid) return new Response("invalid signature", { status: 401 });

  const order = await getOrder(orderId);
  if (!order) return new Response("order not found", { status: 404 });

  await advanceOrder(order);
  return new Response("ok", { status: 200 });
}
