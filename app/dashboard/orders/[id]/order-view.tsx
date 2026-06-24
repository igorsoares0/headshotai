"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/app/dashboard/_components/topbar";
import { STYLES, type StyleKey } from "@/lib/recipe";

type Shot = {
  id: string;
  style: StyleKey;
  idx: number;
  status: string;
  file?: string;
  upscaledFile?: string;
  similarity?: number | null;
  aesthetic?: number | null;
  pass?: boolean;
  nsfw?: boolean;
  delivered?: boolean;
};

type Order = {
  id: string;
  status: "training" | "generating" | "gating" | "scoring" | "upscaling" | "ready" | "failed";
  photoCount: number;
  styles: StyleKey[];
  trainSeconds?: number;
  genSeconds: number;
  shots: Shot[];
  error?: string;
};

const STAGES: { key: Order["status"]; label: string; hint: string }[] = [
  { key: "training", label: "Training", hint: "Learning your face — the longest step" },
  { key: "generating", label: "Generating", hint: "Creating your headshots" },
  { key: "gating", label: "Reviewing", hint: "Keeping only the ones that look like you" },
  { key: "scoring", label: "Selecting", hint: "Scoring and picking your best shots" },
  { key: "upscaling", label: "Enhancing", hint: "Upscaling to 2K and sharpening faces" },
  { key: "ready", label: "Ready", hint: "Your headshots are done" },
];

export function OrderView({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      try {
        const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
        if (res.status === 404) {
          if (alive) setNotFound(true);
          return;
        }
        const data: Order = await res.json();
        if (!alive) return;
        setOrder(data);
        if (data.status !== "ready" && data.status !== "failed") {
          timer = setTimeout(tick, 5000);
        }
      } catch {
        if (alive) timer = setTimeout(tick, 8000);
      }
    }
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [id]);

  if (notFound) {
    return (
      <>
        <Topbar title="Order" subtitle={id} />
        <div className="px-5 py-12 sm:px-8">
          <p className="text-sm text-muted">Order not found.</p>
          <Link href="/dashboard/new" className="mt-3 inline-block text-sm font-medium text-electric hover:underline">
            Start a new batch →
          </Link>
        </div>
      </>
    );
  }

  const currentIdx = order ? STAGES.findIndex((s) => s.key === order.status) : 0;
  // Delivered = the top-N actually selected (upscaled). Headline these. Shots that
  // cleared identity but weren't selected go to an "also passed" section. Shots that
  // failed the identity gate or were flagged NSFW are never surfaced to the user.
  const delivered = order?.shots.filter((s) => s.delivered) ?? [];
  const alsoPassed = order?.shots.filter((s) => s.pass && !s.delivered && !s.nsfw) ?? [];

  return (
    <>
      <Topbar title="Your headshots" subtitle={id} />

      <div className="space-y-8 px-5 py-8 sm:px-8">
        {/* stepper */}
        {order?.status !== "failed" && (
          <div className="rounded-card border border-line bg-paper-raised p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {STAGES.map((stage, i) => {
                const done = i < currentIdx;
                const active = i === currentIdx;
                return (
                  <div key={stage.key} className="flex flex-1 items-center gap-3">
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        done
                          ? "bg-ink text-paper"
                          : active
                            ? "bg-electric text-white"
                            : "border border-line-strong text-muted"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${active ? "text-ink" : done ? "text-ink" : "text-muted"}`}>
                        {stage.label}
                        {active && <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-electric align-middle" />}
                      </p>
                      {active && <p className="truncate text-xs text-muted">{stage.hint}</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* progress detail */}
            {order && (
              <p className="mt-5 border-t border-line pt-4 text-xs text-muted">
                <ProgressLine order={order} />
              </p>
            )}

            {/* reassurance: this takes a while, so let them leave */}
            {order && order.status !== "ready" && (
              <p className="mt-3 flex items-center gap-2 text-xs text-muted">
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-ink text-[9px] text-paper">
                  ✉
                </span>
                You can close this page — we&apos;ll email you when your headshots are ready.
              </p>
            )}
          </div>
        )}

        {order?.status === "failed" && (
          <div className="rounded-card border border-danger/30 bg-danger/5 p-6">
            <p className="font-bold text-danger">Something went wrong</p>
            <p className="mt-2 text-sm text-muted">{order.error}</p>
            <p className="mt-3 text-sm text-muted">
              This batch used your pack. Email us with your order ID and we&apos;ll make it
              right — a free retry or a refund.
            </p>
            <a
              href={`mailto:support@getmodo.pro?subject=${encodeURIComponent(
                `Failed batch ${id}`,
              )}&body=${encodeURIComponent(
                `My headshot batch (order ${id}) failed.\nError: ${order.error ?? "unknown"}`,
              )}`}
              className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition active:scale-[0.97] hover:bg-ink-raised"
            >
              Contact support
            </a>
          </div>
        )}

        {/* results */}
        {order?.status === "ready" && (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="kicker text-muted">Delivered</p>
                <h2 className="text-2xl font-extrabold tracking-tight">
                  {delivered.length} headshots that look like you
                </h2>
              </div>
              <p className="text-xs text-muted">
                {order.shots.length} generated · top {delivered.length} selected & upscaled to 2K
              </p>
            </div>

            <Gallery shots={delivered} />

            {alsoPassed.length > 0 && (
              <details className="rounded-card border border-line bg-paper-raised p-6">
                <summary className="cursor-pointer text-sm font-semibold text-muted">
                  {alsoPassed.length} more that look like you (outside your top {delivered.length})
                </summary>
                <p className="mt-2 text-xs text-muted">
                  Great matches too — they just ranked a little below your selected set.
                </p>
                <div className="mt-4">
                  <Gallery shots={alsoPassed} />
                </div>
              </details>
            )}
          </>
        )}

        {/* live preview of generated shots while still gating/selecting */}
        {order &&
          (order.status === "generating" ||
            order.status === "gating" ||
            order.status === "scoring") && (
            <div>
              <p className="kicker mb-3 text-muted">Coming through…</p>
              <Gallery shots={order.shots.filter((s) => s.file)} />
            </div>
          )}
      </div>
    </>
  );
}

function ProgressLine({ order }: { order: Order }) {
  if (order.status === "training") return <>Training your identity model — this is the long part.</>;
  if (order.status === "generating") {
    const done = order.shots.filter((s) => s.file).length;
    return <>Generated {done} of {order.shots.length} images…</>;
  }
  if (order.status === "gating") {
    const scored = order.shots.filter((s) => s.similarity !== undefined).length;
    const total = order.shots.filter((s) => s.file).length;
    return <>Checking identity on {scored} of {total} images…</>;
  }
  if (order.status === "scoring") {
    const passers = order.shots.filter((s) => s.pass && s.file);
    const done = passers.filter((s) => s.aesthetic !== undefined && s.nsfw !== undefined).length;
    return <>Scoring quality on {done} of {passers.length} matches…</>;
  }
  if (order.status === "upscaling") {
    const delivered = order.shots.filter((s) => s.delivered);
    const done = delivered.filter((s) => s.upscaledFile).length;
    return <>Upscaling {done} of {delivered.length} headshots to 2K…</>;
  }
  return null;
}

function Gallery({ shots }: { shots: Shot[] }) {
  if (shots.length === 0) {
    return <p className="text-sm text-muted">Nothing here yet.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {shots.map((s) => (
        <figure key={s.id} className="overflow-hidden rounded-card border border-line bg-paper-raised">
          <div className="relative aspect-[4/5] bg-paper-sunken">
            {s.file ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.upscaledFile ?? s.file} alt={STYLES[s.style]?.label ?? s.style} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-xs text-muted">…</div>
            )}
          </div>
          <figcaption className="px-3 py-2 text-xs">
            <span className="font-medium">{STYLES[s.style]?.label ?? s.style}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
