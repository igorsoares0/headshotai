import Link from "next/link";
import { Topbar } from "@/app/dashboard/_components/topbar";
import { StatusBadge } from "@/app/dashboard/_components/status-badge";
import { activeOrder, dashboardStats, galleryShots } from "@/lib/view";
import { requireUserId } from "@/lib/dal";

export const dynamic = "force-dynamic";

const STAGES = ["training", "generating", "gating", "ready"] as const;
const STAGE_LABEL: Record<(typeof STAGES)[number], string> = {
  training: "Training",
  generating: "Generating",
  gating: "Reviewing",
  ready: "Ready",
};

export default async function DashboardHome() {
  const userId = await requireUserId();
  const stats = await dashboardStats(userId);
  const active = await activeOrder(userId);
  const recent = (await galleryShots(userId)).slice(0, 8);

  const summary = [
    { label: "Orders", value: String(stats.orders), hint: "all time" },
    { label: "Headshots", value: String(stats.delivered), hint: "delivered" },
    { label: "In progress", value: String(stats.inProgress), hint: "generating now" },
    { label: "Ready", value: String(stats.ready), hint: "completed batches" },
  ];

  const currentIdx = active ? STAGES.indexOf(active.status as (typeof STAGES)[number]) : -1;
  const doneShots = active?.shots.filter((s) => s.file).length ?? 0;

  return (
    <>
      <Topbar title="Dashboard" subtitle="Welcome back, Igor" />

      <div className="space-y-8 px-5 py-8 sm:px-8">
        {/* summary cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {summary.map((s) => (
            <div key={s.label} className="rounded-card border border-line bg-paper-raised p-5">
              <p className="kicker text-muted">{s.label}</p>
              <p className="mt-3 text-4xl font-extrabold tracking-tight">{s.value}</p>
              <p className="mt-1 text-xs text-muted">{s.hint}</p>
            </div>
          ))}
        </div>

        {/* active order progress */}
        {active ? (
          <Link
            href={`/dashboard/orders/${active.id}`}
            className="block rounded-card border border-line bg-ink p-6 text-paper transition-opacity hover:opacity-95 sm:p-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="kicker text-muted-dark">Order {active.id}</p>
                <h2 className="mt-1 text-xl font-bold tracking-tight">
                  {active.status === "training"
                    ? "Training your identity model…"
                    : active.status === "generating"
                      ? `Generating headshots — ${doneShots}/${active.shots.length} done`
                      : "Reviewing identity on your headshots…"}
                </h2>
              </div>
              <StatusBadge status={active.status.toUpperCase()} />
            </div>

            <ol className="mt-8 grid gap-3 sm:grid-cols-4">
              {STAGES.map((state, i) => {
                const done = i < currentIdx;
                const now = i === currentIdx;
                return (
                  <li key={state} className="flex items-center gap-3 sm:flex-col sm:items-start">
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        done ? "bg-electric text-white" : now ? "bg-paper text-ink" : "border border-line-invert text-muted-dark"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span className={`font-mono text-[10px] uppercase tracking-wide ${now ? "text-paper" : "text-muted-dark"}`}>
                      {STAGE_LABEL[state]}
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-ink-raised">
              <div
                className="h-full rounded-full bg-electric transition-all"
                style={{ width: `${((currentIdx + 0.5) / STAGES.length) * 100}%` }}
              />
            </div>
          </Link>
        ) : (
          <div className="rounded-card border border-line bg-paper-raised p-6 sm:p-8">
            <p className="kicker text-muted">No active batch</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">Ready when you are</h2>
            <p className="mt-2 text-sm text-muted">Upload your selfies and generate a fresh set of headshots.</p>
          </div>
        )}

        {/* recent + upload split */}
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-card border border-line bg-paper-raised p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold tracking-tight">Recent headshots</h3>
              <Link href="/dashboard/gallery" className="text-sm font-medium text-electric hover:underline">
                View gallery →
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="mt-5 text-sm text-muted">Your delivered headshots will show up here.</p>
            ) : (
              <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {recent.map((shot) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={shot.id} src={shot.file} alt={shot.styleLabel} className="aspect-square w-full rounded-xl object-cover" />
                ))}
              </div>
            )}
          </div>

          <Link
            href="/dashboard/new"
            className="group flex flex-col justify-between rounded-card border border-dashed border-line-strong bg-paper-raised p-6 transition-colors hover:border-electric hover:bg-paper-sunken"
          >
            <div className="grid h-11 w-11 place-items-center rounded-full bg-ink text-paper transition-colors group-hover:bg-electric">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <div className="mt-10">
              <h3 className="text-lg font-bold tracking-tight">Start a new batch</h3>
              <p className="mt-2 text-sm text-muted">
                Upload selfies and generate a fresh set of styles from your identity model.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}
