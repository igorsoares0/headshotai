"use client";

import { useMemo, useState } from "react";
import { Topbar } from "@/app/dashboard/_components/topbar";
import { Portrait } from "@/app/components/portrait";
import { gallery, styleCategories } from "@/lib/data";

const filters = ["All", ...styleCategories.map((c) => c.category)];

export default function GalleryPage() {
  const [filter, setFilter] = useState("All");
  const [favs, setFavs] = useState<Set<string>>(
    () => new Set(gallery.filter((s) => s.favorite).map((s) => s.id)),
  );

  const shots = useMemo(
    () => (filter === "All" ? gallery : gallery.filter((s) => s.category === filter)),
    [filter],
  );

  function toggle(id: string) {
    setFavs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <>
      <Topbar title="Gallery" subtitle={`${gallery.length} headshots · ${favs.size} favorited`} />

      <div className="px-5 py-8 sm:px-8">
        {/* filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {filters.map((f) => (
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

        {/* grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {shots.map((shot) => {
            const isFav = favs.has(shot.id);
            return (
              <div
                key={shot.id}
                className="group relative overflow-hidden rounded-card border border-line"
              >
                <Portrait seed={shot.seed} className="aspect-[4/5] w-full" />

                {/* score */}
                <span className="kicker absolute left-2 top-2 rounded-full bg-black/40 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
                  {shot.score}↑
                </span>

                {/* favorite */}
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

                {/* hover bar */}
                <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-3 transition-transform group-hover:translate-y-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{shot.style}</p>
                    <p className="truncate text-[11px] text-white/60">{shot.category}</p>
                  </div>
                  <button className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-paper">
                    Download
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
