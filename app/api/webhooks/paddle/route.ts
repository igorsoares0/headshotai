import { EventName } from "@paddle/paddle-node-sdk";
import { paddle, PADDLE_WEBHOOK_SECRET } from "@/lib/paddle";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Paddle calls this when a transaction completes. We verify the signature, then
 * mark the matching pending Purchase (carried in customData.purchaseId) as
 * completed. Idempotent: paddleTxnId is unique, so replays are no-ops.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("paddle-signature") ?? "";

  let event;
  try {
    event = await paddle.webhooks.unmarshal(raw, PADDLE_WEBHOOK_SECRET, signature);
  } catch {
    return new Response("invalid signature", { status: 401 });
  }
  if (!event) return new Response("invalid signature", { status: 401 });

  if (event.eventType === EventName.TransactionCompleted) {
    const txn = event.data;
    const purchaseId = (txn.customData as { purchaseId?: string } | null)?.purchaseId;
    if (purchaseId) {
      // customData.purchaseId and the checkout's priceId are both chosen client-side,
      // so a caller could pair a cheap price with an expensive pack's purchase. Before
      // granting entitlement, confirm the transaction actually paid for THIS purchase's
      // price — otherwise a $25 payment could complete an 80-photo pack.
      const purchase = await prisma.purchase.findUnique({ where: { id: purchaseId } });
      const paidForPrice = txn.items.some((item) => item.price?.id === purchase?.priceId);

      if (purchase && paidForPrice) {
        // Only promote a still-pending row; don't resurrect consumed/refunded ones.
        await prisma.purchase.updateMany({
          where: { id: purchaseId, status: "pending" },
          data: { status: "completed", paddleTxnId: txn.id },
        });
      } else {
        console.error(
          `[paddle webhook] price mismatch for purchase ${purchaseId} (txn ${txn.id}); not granting entitlement`,
        );
      }
    }
  }

  return new Response("ok", { status: 200 });
}
