import Link from "next/link";
import { Topbar } from "@/app/dashboard/_components/topbar";
import { AccountForm } from "./account-form";
import { DangerZone } from "./danger-zone";
import { getUser } from "@/lib/dal";
import { getActivePurchase } from "@/lib/entitlement";
import { listOrders } from "@/lib/store";

export const dynamic = "force-dynamic";

function initials(name: string | null, email: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return email[0].toUpperCase();
}

const fmtDate = (d: Date | number) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

export default async function ProfilePage() {
  const user = await getUser();
  const orders = await listOrders(user.id);
  // Most recent batch that actually trained a model — the user's "identity model".
  const trained = orders.find((o) => o.trainedVersion);
  const activePack = await getActivePurchase(user.id);

  return (
    <>
      <Topbar title="Profile" subtitle="Account and AI identity model" />

      <div className="grid gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1.4fr_1fr]">
        {/* details */}
        <div className="rounded-card border border-line bg-paper-raised p-6 sm:p-8">
          <h2 className="font-bold tracking-tight">Account details</h2>
          <div className="mt-6 flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-electric text-xl font-bold text-white">
              {initials(user.name, user.email)}
            </span>
            <p className="text-sm text-muted">Member since {fmtDate(user.createdAt)}</p>
          </div>

          <AccountForm
            initialName={user.name ?? ""}
            email={user.email}
            verified={!!user.emailVerified}
          />
        </div>

        {/* identity model */}
        <div className="space-y-6">
          <div className="rounded-card border border-line bg-paper-raised p-6">
            <p className="kicker text-muted">AI identity model</p>
            {trained ? (
              <>
                <div className="mt-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-electric" />
                  <p className="font-bold tracking-tight">Trained &amp; ready</p>
                </div>
                <p className="mt-2 text-sm text-muted">
                  Trained on {trained.photoCount} selfies · {fmtDate(trained.createdAt)}. Generate
                  new styles anytime.
                </p>
                <Link
                  href={activePack ? "/dashboard/new" : "/dashboard/billing"}
                  className="mt-5 block rounded-full bg-electric px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-electric-dim"
                >
                  {activePack ? "Generate new headshots" : "Buy a pack to generate"}
                </Link>
              </>
            ) : (
              <>
                <div className="mt-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-ink/30" />
                  <p className="font-bold tracking-tight">No model yet</p>
                </div>
                <p className="mt-2 text-sm text-muted">
                  Upload selfies on your first batch and we&apos;ll train your identity model.
                </p>
                <Link
                  href={activePack ? "/dashboard/new" : "/dashboard/billing"}
                  className="mt-5 block rounded-full bg-electric px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-electric-dim"
                >
                  {activePack ? "Start your first batch" : "Buy a pack to start"}
                </Link>
              </>
            )}
          </div>

          <DangerZone />
        </div>
      </div>
    </>
  );
}
