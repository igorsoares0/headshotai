"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { priceIdFor } from "@/lib/paddle";
import { packById } from "@/lib/packs";

/**
 * Begin a checkout: record a pending Purchase and hand the client the priceId +
 * purchaseId. The client opens the Paddle overlay with `customData.purchaseId`;
 * the webhook flips the row to `completed` once payment clears.
 */
export async function createCheckout(
  packId: string,
): Promise<{ purchaseId: string; priceId: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not signed in." };

  const pack = packById(packId);
  if (!pack) return { error: "Unknown pack." };

  let priceId: string;
  try {
    priceId = priceIdFor(pack.id);
  } catch {
    return { error: "Checkout is not configured yet." };
  }

  const purchase = await prisma.purchase.create({
    data: {
      userId: session.user.id,
      packId: pack.id,
      photoCount: pack.photoCount,
      priceId,
      status: "pending",
    },
  });

  return { purchaseId: purchase.id, priceId };
}
