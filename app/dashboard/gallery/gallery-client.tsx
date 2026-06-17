"use client";

import { useMemo, useState } from "react";
import { useFavorites } from "@/app/dashboard/_components/use-favorites";
import type { GalleryShot } from "@/lib/view";

export function GalleryClient({
  shots,
  categories,
}: {
  shots: GalleryShot[];
  categories: string[];
}) {
  const [filter, setFilter] = useState("All");
  const { favs, toggle } = useFavorites();

  const visible = useMemo(
    () => (filter === "All" ? shots : shots.filter((s) => s.styleLabel === filter)),
    [filter, shots],
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2">
        {categories.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              filter === f
                ? "border-ink bg-ink text-paper"
                : "border-line bg-paper-raised text-muted hover:text-ink"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((shot) => {
          const isFav = favs.has(shot.id);
          return (
            <div key={shot.id} className="group relative overflow-hidden rounded-card border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shot.file} alt={shot.styleLabel} className="aspect-[4/5] w-full object-cover" />

              <span className="kicker absolute left-2 top-2 rounded-full bg-black/40 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
                {shot.score}↑
              </span>

              <button
                onClick={() => toggle(shot.id)}
                aria-label="Toggle favorite"
                className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full backdrop-blur-sm transition-colors ${
                  isFav ? "bg-electric text-white" : "bg-black/40 text-white hover:bg-black/60"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.75">
                  <path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18.8 6.2 21.8l1.1-6.5L2.6 9.8l6.5-.9z" />
                </svg>
              </button>

              <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-3 transition-transform group-hover:translate-y-0">
                <p className="truncate text-sm font-semibold text-white">{shot.styleLabel}</p>
                <a
                  href={shot.file}
                  download
                  className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper"
                >
                  Download
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
