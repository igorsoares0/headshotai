import { Topbar } from "@/app/dashboard/_components/topbar";
import { packages, orders } from "@/lib/data";

const invoices = orders
  .filter((o) => o.status !== "FAILED")
  .map((o) => ({
    id: o.id,
    date: o.date,
    pkg: o.pkg,
    amount: o.pkg === "Executive" ? 99 : o.pkg === "Professional" ? 49 : 29,
  }));

export default function BillingPage() {
  return (
    <>
      <Topbar title="Billing" subtitle="Plans, top-ups and invoices" />

      <div className="space-y-8 px-5 py-8 sm:px-8">
        {/* current plan */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-ink p-6 text-paper">
          <div>
            <p className="kicker text-muted-dark">Current pack</p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight">Professional</p>
            <p className="mt-1 text-sm text-muted-dark">82 of 120 credits remaining</p>
          </div>
          <div className="w-full max-w-xs">
            <div className="h-2 overflow-hidden rounded-full bg-ink-raised">
              <div className="h-full w-[68%] rounded-full bg-electric" />
            </div>
          </div>
        </div>

        {/* top-up packs */}
        <div>
          <h2 className="mb-4 font-bold tracking-tight">Add more credits</h2>
          <div className="grid gap-4 lg:grid-cols-3">
            {packages.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between rounded-card border p-5 ${
                  p.featured ? "border-electric bg-paper-raised" : "border-line bg-paper-raised"
                }`}
              >
                <div>
                  <p className="font-bold tracking-tight">{p.name}</p>
                  <p className="text-sm text-muted">
                    {p.headshots} headshots · {p.styles} styles
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold tracking-tight">${p.price}</p>
                  <button className="mt-1 rounded-full bg-electric px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-electric-dim">
                    Buy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* invoices */}
        <div>
          <h2 className="mb-4 font-bold tracking-tight">Invoices</h2>
          <div className="overflow-hidden rounded-card border border-line bg-paper-raised">
            <ul className="divide-y divide-line">
              {invoices.map((inv) => (
                <li
                  key={inv.id}
                  className="grid grid-cols-2 items-center gap-4 px-6 py-4 sm:grid-cols-4"
                >
                  <span className="font-mono text-sm">{inv.id}</span>
                  <span className="text-sm text-muted">{inv.date}</span>
                  <span className="text-sm">{inv.pkg}</span>
                  <span className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="font-semibold">${inv.amount}.00</span>
                    <a href="#" className="text-sm font-medium text-electric hover:underline">
                      PDF
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
