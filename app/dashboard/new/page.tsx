import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/dal";
import { getActivePurchase } from "@/lib/entitlement";
import { packById } from "@/lib/packs";
import { NewClient } from "./new-client";

export const dynamic = "force-dynamic";

export default async function NewBatchPage() {
  const userId = await requireUserId();

  // Pay-first: no upload UI until there's a paid, unconsumed pack.
  const purchase = await getActivePurchase(userId);
  if (!purchase) redirect("/dashboard/billing");

  const pack = packById(purchase.packId);
  return (
    <NewClient pack={{ name: pack?.name ?? "Pack", photoCount: purchase.photoCount }} />
  );
}
