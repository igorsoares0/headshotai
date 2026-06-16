import Link from "next/link";
import { Topbar } from "@/app/dashboard/_components/topbar";
import { StatusBadge } from "@/app/dashboard/_components/status-badge";
import { orders } from "@/lib/data";

export default function OrdersPage() {
  return (
    <>
      <Topbar title="Orders" subtitle="Your headshot packages and their status" />

      <div className="px-5 py-8 sm:px-8">
        <div className="overflow-hidden rounded-card border border-line bg-paper-raised">
          {/* header */}
          <div className="hidden grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 border-b border-line px-6 py-4 sm:grid">
            {["Order", "Package", "Date", "Status", ""].map((h) => (
              <span key={h} className="kicker text-muted">
                {h}
              </span>
            ))}
          </div>

          <ul className="divide-y divide-line">
            {orders.map((o) => (
              <li
                key={o.id}
                className="grid grid-cols-2 items-center gap-4 px-6 py-5 transition-colors hover:bg-paper-sunken sm:grid-cols-[1fr_1fr_1fr_1fr_auto]"
              >
                <span className="font-mono text-sm font-medium">{o.id}</span>
                <span className="text-sm">{o.pkg}</span>
                <span className="text-sm text-muted">{o.date}</span>
                <span>
                  <StatusBadge status={o.status} />
                </span>
                <span className="col-span-2 sm:col-span-1 sm:text-right">
                  {o.status === "READY" ? (
                    <Link
                      href="/dashboard/gallery"
                      className="text-sm font-medium text-electric hover:underline"
                    >
                      View →
                    </Link>
                  ) : o.status === "FAILED" ? (
                    <button className="text-sm font-medium text-ink/70 hover:text-ink">
                      Retry
                    </button>
                  ) : (
                    <span className="text-sm text-muted">{o.headshots} shots</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
