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
  } catch (err) {
    // TEMP diagnostics — remove once the webhook verifies.
    console.error("[paddle webhook] signature check failed:", {
      reason: err instanceof Error ? err.message : String(err),
      hasSignatureHeader: signature.length > 0,
      signaturePreview: signature.slice(0, 40),
      secretIsSet: PADDLE_WEBHOOK_SECRET.length > 0,
      secretPrefix: PADDLE_WEBHOOK_SECRET.slice(0, 11), // should be "pdl_ntfset_"
      bodyLength: raw.length,
    });
    return new Response("invalid signature", { status: 401 });
  }
  if (!event) return new Response("invalid signature", { status: 401 });

  if (event.eventType === EventName.TransactionCompleted) {
    const txn = event.data;
    const purchaseId = (txn.customData as { purchaseId?: string } | null)?.purchaseId;
    if (purchaseId) {
      // Only promote a still-pending row; don't resurrect consumed/refunded ones.
      await prisma.purchase.updateMany({
        where: { id: purchaseId, status: "pending" },
        data: { status: "completed", paddleTxnId: txn.id },
      });
    }
  }

  return new Response("ok", { status: 200 });
}
