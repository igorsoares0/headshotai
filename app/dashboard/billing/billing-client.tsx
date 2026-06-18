"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { createCheckout } from "@/app/actions/billing";
import type { Pack } from "@/lib/packs";

export function BillingClient({ packs }: { packs: Pack[] }) {
  const router = useRouter();
  const [paddle, setPaddle] = useState<Paddle>();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!token) return;
    initializePaddle({
      environment:
        process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox",
      token,
      eventCallback: (e) => {
        // Payment captured in the overlay — the webhook finalizes the purchase;
        // send the user to upload (the page re-checks the entitlement server-side).
        if (e.name === "checkout.completed") router.push("/dashboard/new");
      },
    }).then((p) => p && setPaddle(p));
  }, [router]);

  async function buy(packId: string) {
    setError(null);
    setBusy(packId);
    try {
      const res = await createCheckout(packId);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      if (!paddle) {
        setError("Checkout is unavailable right now.");
        return;
      }
      paddle.Checkout.open({
        items: [{ priceId: res.priceId, quantity: 1 }],
        customData: { purchaseId: res.purchaseId },
        settings: { successUrl: `${window.location.origin}/dashboard/new` },
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {error ? (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        {packs.map((p) => (
          <div
            key={p.id}
            className={`flex flex-col rounded-card border p-6 ${
              p.featured ? "border-electric bg-paper-raised" : "border-line bg-paper-raised"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-bold tracking-tight">{p.name}</p>
              {p.featured ? (
                <span className="rounded-full bg-electric px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Popular
                </span>
              ) : null}
            </div>
            <p className="mt-3 display text-4xl">${p.price}</p>
            <p className="mt-1 text-sm text-muted">{p.photoCount} headshots</p>
            <ul className="mt-4 flex-1 space-y-2">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted">
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-ink text-[10px] text-paper">
                    ✓
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => buy(p.id)}
              disabled={busy === p.id}
              className="mt-6 rounded-full bg-electric px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-electric-dim disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy === p.id ? "Opening checkout…" : `Buy ${p.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
