import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * The user's first paid, unconsumed purchase — their right to start one batch.
 * A refund/chargeback moves the row to `refunded` (see the Paddle webhook); the
 * `refundedAt` clause is belt-and-suspenders so a row that somehow kept
 * `completed` while carrying a refund stamp still can't be spent.
 */
export async function getActivePurchase(userId: string) {
  return prisma.purchase.findFirst({
    where: { userId, status: "completed", refundedAt: null },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Atomically reserve a purchase (completed → consumed). Conditioned on the
 * current status so two concurrent order creations can't spend the same one.
 * Returns true if this call won the race. Link the order id afterward with
 * `linkPurchaseOrder`, or release it with `releasePurchase` if creation fails.
 */
export async function consumePurchase(purchaseId: string): Promise<boolean> {
  const res = await prisma.purchase.updateMany({
    // Re-checks refundedAt: a refund webhook can land between the read in
    // getActivePurchase and this reservation.
    where: { id: purchaseId, status: "completed", refundedAt: null },
    data: { status: "consumed" },
  });
  return res.count === 1;
}

export async function linkPurchaseOrder(purchaseId: string, orderId: string): Promise<void> {
  await prisma.purchase.update({ where: { id: purchaseId }, data: { orderId } });
}

/** Undo a reservation if order creation failed — the user keeps their entitlement. */
export async function releasePurchase(purchaseId: string): Promise<void> {
  await prisma.purchase.updateMany({
    where: { id: purchaseId, status: "consumed", orderId: null },
    data: { status: "completed" },
  });
}
