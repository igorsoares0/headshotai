import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/dal";
import { getActivePurchase } from "@/lib/entitlement";
import { packById } from "@/lib/packs";
import { prisma } from "@/lib/prisma";
import { NewClient } from "./new-client";
import { VerifyNotice } from "./verify-notice";

export const dynamic = "force-dynamic";

export default async function NewBatchPage() {
  const userId = await requireUserId();

  // Gate the paid flow on a confirmed email (mirrors POST /api/orders).
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, emailVerified: true },
  });
  if (user && !user.emailVerified) return <VerifyNotice email={user.email} />;

  // Pay-first: no upload UI until there's a paid, unconsumed pack.
  const purchase = await getActivePurchase(userId);
  if (!purchase) redirect("/dashboard/billing");

  const pack = packById(purchase.packId);
  return (
    <NewClient pack={{ name: pack?.name ?? "Pack", photoCount: purchase.photoCount }} />
  );
}
