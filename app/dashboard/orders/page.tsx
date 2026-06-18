import Link from "next/link";
import { Topbar } from "@/app/dashboard/_components/topbar";
import { StatusBadge } from "@/app/dashboard/_components/status-badge";
import { orderRows } from "@/lib/view";
import { requireUserId } from "@/lib/dal";

export const dynamic = "force-dynamic"; // always read the live store

export default async function OrdersPage() {
  const rows = orderRows(await requireUserId());

  return (
    <>
      <Topbar title="Orders" subtitle="Your headshot batches and their status" />

      <div className="px-5 py-8 sm:px-8">
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-hidden rounded-card border border-line bg-paper-raised">
            <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-4 border-b border-line px-6 py-4 sm:grid">
              {["Order", "Pack", "Date", "Status", ""].map((h) => (
                <span key={h} className="kicker text-muted">
                  {h}
                </span>
              ))}
            </div>

            <ul className="divide-y divide-line">
              {rows.map((o) => (
                <li
                  key={o.id}
                  className="grid grid-cols-2 items-center gap-4 px-6 py-5 transition-colors hover:bg-paper-sunken sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto]"
                >
                  <Link href={`/dashboard/orders/${o.id}`} className="font-mono text-sm font-medium hover:text-electric">
                    {o.id}
                  </Link>
                  <span className="text-sm">{o.pkgName}</span>
                  <span className="text-sm text-muted">{o.date}</span>
                  <span>
                    <StatusBadge status={o.statusLabel} />
                  </span>
                  <span className="col-span-2 sm:col-span-1 sm:text-right">
                    {o.rawStatus === "ready" ? (
                      <Link href={`/dashboard/orders/${o.id}`} className="text-sm font-medium text-electric hover:underline">
                        View {o.delivered} →
                      </Link>
                    ) : o.rawStatus === "failed" ? (
                      <Link href="/dashboard/new" className="text-sm font-medium text-ink/70 hover:text-ink">
                        Retry
                      </Link>
                    ) : (
                      <Link href={`/dashboard/orders/${o.id}`} className="text-sm text-muted hover:text-ink">
                        Track →
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="grid place-items-center rounded-card border border-dashed border-line-strong bg-paper-raised py-24 text-center">
      <p className="text-muted">No orders yet.</p>
      <Link
        href="/dashboard/new"
        className="mt-4 rounded-full bg-electric px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-electric-dim"
      >
        Create your first batch
      </Link>
    </div>
  );
}
