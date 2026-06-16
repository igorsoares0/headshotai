"use client";

import { useState } from "react";
import Link from "next/link";
import { Topbar } from "@/app/dashboard/_components/topbar";
import { packages } from "@/lib/data";

export default function NewBatchPage() {
  const [selected, setSelected] = useState("professional");
  const [files, setFiles] = useState(0);

  return (
    <>
      <Topbar title="New headshots" subtitle="Upload selfies and pick a pack" />

      <div className="grid gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1.4fr_1fr]">
        {/* upload */}
        <div className="space-y-6">
          <div className="rounded-card border border-line bg-paper-raised p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold tracking-tight">1 · Upload selfies</h2>
              <span className="kicker text-muted">{files}/25 added</span>
            </div>

            <label
              className="mt-5 grid cursor-pointer place-items-center rounded-card border-2 border-dashed border-line-strong bg-paper py-14 text-center transition-colors hover:border-electric hover:bg-paper-sunken"
              onClick={(e) => {
                // demo only: simulate adding photos
                e.preventDefault();
                setFiles((f) => Math.min(25, f + 6));
              }}
            >
              <div className="grid h-12 w-12 place-items-center rounded-full bg-ink text-paper">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 16V4m0 0L7 9m5-5 5 5" />
                  <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
                </svg>
              </div>
              <p className="mt-4 text-sm font-semibold">
                Drag &amp; drop or click to upload
              </p>
              <p className="mt-1 text-xs text-muted">
                JPG, JPEG or PNG · up to 15MB each · 10–25 photos
              </p>
            </label>

            {/* requirements checklist */}
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {[
                "One clear face per photo",
                "Min 1024px resolution",
                "No sunglasses or masks",
                "Varied angles & lighting",
              ].map((r) => (
                <li key={r} className="flex items-center gap-2 text-sm text-muted">
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-ink text-[10px] text-paper">
                    ✓
                  </span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* pack + submit */}
        <div className="space-y-6">
          <div className="rounded-card border border-line bg-paper-raised p-6">
            <h2 className="font-bold tracking-tight">2 · Choose a pack</h2>
            <div className="mt-5 space-y-3">
              {packages.map((p) => {
                const active = selected === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p.id)}
                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors ${
                      active
                        ? "border-electric bg-electric/5"
                        : "border-line hover:bg-paper-sunken"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`grid h-5 w-5 place-items-center rounded-full border ${
                          active ? "border-electric bg-electric text-white" : "border-line-strong"
                        }`}
                      >
                        {active ? (
                          <span className="h-2 w-2 rounded-full bg-white" />
                        ) : null}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">{p.name}</span>
                        <span className="block text-xs text-muted">
                          {p.headshots} shots · {p.styles} styles
                        </span>
                      </span>
                    </span>
                    <span className="text-lg font-extrabold tracking-tight">${p.price}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            disabled={files < 10}
            className="w-full rounded-full bg-electric px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-electric-dim disabled:cursor-not-allowed disabled:opacity-40"
          >
            {files < 10 ? `Add ${10 - files} more photos` : "Continue to checkout →"}
          </button>
          <Link
            href="/dashboard"
            className="block text-center text-sm font-medium text-muted hover:text-ink"
          >
            Cancel
          </Link>
        </div>
      </div>
    </>
  );
}
