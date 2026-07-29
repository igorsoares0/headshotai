import { EventName } from "@paddle/paddle-node-sdk";
import { paddle, PADDLE_WEBHOOK_SECRET } from "@/lib/paddle";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Paddle calls this for the billing events we subscribe to:
 *
 *   transaction.completed → grant the entitlement (pending → completed)
 *   adjustment.created    → refund/chargeback: revoke it (completed → refunded)
 *   adjustment.updated    → the adjustment was rejected: put it back
 *
 * Everything is signature-verified first and idempotent: grants and revocations
 * are conditioned on the current status, and paddleTxnId is unique — so replays
 * and out-of-order deliveries are no-ops.
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

  switch (event.eventType) {
    case EventName.TransactionCompleted: {
      const txn = event.data;
      const purchaseId = (txn.customData as { purchaseId?: string } | null)?.purchaseId;
      if (!purchaseId) break;

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
      break;
    }

    // A refund or chargeback was raised. We revoke on `created`, while the
    // adjustment may still be pending_approval — leaving the entitlement open
    // through a dispute is how you end up paying for a batch you refunded.
    // `adjustment.updated` below puts it back if Paddle rejects the adjustment.
    case EventName.AdjustmentCreated: {
      const adj = event.data;
      if (adj.action === "refund" || adj.action === "chargeback") {
        await revokeForTransaction(adj.transactionId, adj.action, adj.id);
      } else if (
        adj.action === "chargeback_reverse" ||
        adj.action === "chargeback_warning_reverse"
      ) {
        // The bank sided with us — the money is back, so is the entitlement.
        await restoreForTransaction(adj.transactionId, adj.id);
      } else {
        // chargeback_warning (a pre-dispute notice, often reversed) and the
        // credit/* actions (subscription-only) move no money here.
        console.warn(
          `[paddle webhook] adjustment ${adj.id} action "${adj.action}" on txn ${adj.transactionId} — no entitlement change`,
        );
      }
      break;
    }

    // Status moved after the fact. A rejected adjustment means the refund never
    // happened, so a revocation we already applied has to be undone.
    case EventName.AdjustmentUpdated: {
      const adj = event.data;
      if (adj.status === "rejected") await restoreForTransaction(adj.transactionId, adj.id);
      break;
    }
  }

  return new Response("ok", { status: 200 });
}

/**
 * Money went back to the customer for `transactionId`. An unspent purchase loses
 * its entitlement outright. One that was already consumed keeps its status — the
 * order exists and the photos were delivered — and only gets stamped: that case
 * is a human decision (support, ban, write-off), not something to automate.
 */
async function revokeForTransaction(
  transactionId: string,
  action: string,
  adjustmentId: string,
): Promise<void> {
  const purchase = await prisma.purchase.findUnique({ where: { paddleTxnId: transactionId } });
  if (!purchase) {
    // Expected for transactions this app didn't issue; still worth a line.
    console.warn(
      `[paddle webhook] ${action} (adjustment ${adjustmentId}) for unknown txn ${transactionId}`,
    );
    return;
  }
  if (purchase.refundedAt) return; // already revoked — replay or partial follow-up

  if (purchase.status === "consumed") {
    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { refundedAt: new Date() },
    });
    console.error(
      `[paddle webhook] ${action} on ALREADY-CONSUMED purchase ${purchase.id} (order ${purchase.orderId}, txn ${transactionId}) — photos were delivered; needs manual review`,
    );
    return;
  }

  // pending or completed → nothing was spent, take the entitlement back.
  await prisma.purchase.updateMany({
    where: { id: purchase.id, status: { in: ["pending", "completed"] } },
    data: { status: "refunded", refundedAt: new Date() },
  });
  console.warn(`[paddle webhook] ${action} revoked purchase ${purchase.id} (txn ${transactionId})`);
}

/** Undo a revocation: the refund/chargeback was rejected or reversed. */
async function restoreForTransaction(transactionId: string, adjustmentId: string): Promise<void> {
  const purchase = await prisma.purchase.findUnique({ where: { paddleTxnId: transactionId } });
  if (!purchase?.refundedAt) return; // nothing was revoked

  await prisma.purchase.update({
    where: { id: purchase.id },
    // Only a purchase we revoked goes back to `completed`; a consumed one stays
    // consumed (its order already exists) and just loses the stamp.
    data: {
      status: purchase.status === "refunded" ? "completed" : purchase.status,
      refundedAt: null,
    },
  });
  console.warn(
    `[paddle webhook] adjustment ${adjustmentId} reversed/rejected — restored purchase ${purchase.id}`,
  );
}
