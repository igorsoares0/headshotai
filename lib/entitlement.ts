import "server-only";
import { prisma } from "@/lib/prisma";

/** The user's first paid, unconsumed purchase — their right to start one batch. */
export async function getActivePurchase(userId: string) {
  return prisma.purchase.findFirst({
    where: { userId, status: "completed" },
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
    where: { id: purchaseId, status: "completed" },
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
