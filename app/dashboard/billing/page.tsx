import { Topbar } from "@/app/dashboard/_components/topbar";
import { requireUserId } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { PACKS, packById } from "@/lib/packs";
import { BillingClient } from "./billing-client";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  completed: "Ready to use",
  consumed: "Used",
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export default async function BillingPage() {
  const userId = await requireUserId();
  const purchases = await prisma.purchase.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const active = purchases.filter((p) => p.status === "completed").length;

  return (
    <>
      <Topbar title="Billing" subtitle="Buy a pack to generate headshots" />

      <div className="space-y-8 px-5 py-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-ink p-6 text-paper">
          <div>
            <p className="kicker text-muted-dark">Packs ready to use</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight">{active}</p>
          </div>
          <p className="max-w-xs text-sm text-muted-dark">
            Each pack is a one-time purchase that delivers one batch of headshots.
          </p>
        </div>

        <div>
          <h2 className="mb-4 font-bold">Choose a pack</h2>
          <BillingClient packs={PACKS} />
        </div>

        {purchases.length > 0 ? (
          <div>
            <h2 className="mb-4 font-bold">Purchases</h2>
            <div className="overflow-hidden rounded-card border border-line bg-paper-raised">
              <ul className="divide-y divide-line">
                {purchases.map((p) => (
                  <li
                    key={p.id}
                    className="grid grid-cols-2 items-center gap-4 px-6 py-4 sm:grid-cols-4"
                  >
                    <span className="text-sm font-semibold">
                      {packById(p.packId)?.name ?? p.packId}
                    </span>
                    <span className="text-sm text-muted">{fmtDate(p.createdAt)}</span>
                    <span className="text-sm text-muted">{p.photoCount} photos</span>
                    <span className="sm:text-right">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          p.status === "completed"
                            ? "bg-electric/10 text-electric"
                            : p.status === "consumed"
                              ? "bg-ink/5 text-muted"
                              : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
