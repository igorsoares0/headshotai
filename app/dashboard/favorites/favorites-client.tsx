"use client";

import Link from "next/link";
import { useFavorites } from "@/app/dashboard/_components/use-favorites";
import type { GalleryShot } from "@/lib/view";

export function FavoritesClient({ shots }: { shots: GalleryShot[] }) {
  const { favs } = useFavorites();
  const favorites = shots.filter((s) => favs.has(s.id));

  if (favorites.length === 0) {
    return (
      <>
        <div className="grid place-items-center rounded-card border border-dashed border-line-strong bg-paper-raised py-24 text-center">
          <p className="text-muted">No favorites yet.</p>
          <p className="mt-1 text-xs text-muted">Tap the star on any headshot in the gallery.</p>
        </div>
        <Link href="/dashboard/gallery" className="mt-6 inline-block text-sm font-medium text-electric hover:underline">
          ← Back to gallery
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {favorites.map((shot) => (
          <div key={shot.id} className="group relative overflow-hidden rounded-card border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shot.file} alt={shot.styleLabel} className="aspect-[4/5] w-full object-cover" />
            <span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-electric text-white">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18.8 6.2 21.8l1.1-6.5L2.6 9.8l6.5-.9z" />
              </svg>
            </span>
            <div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-3 transition-transform group-hover:translate-y-0">
              <p className="truncate text-sm font-semibold text-white">{shot.styleLabel}</p>
              <a href={shot.file} download className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper">
                Download
              </a>
            </div>
          </div>
        ))}
      </div>
      <Link href="/dashboard/gallery" className="mt-6 inline-block text-sm font-medium text-electric hover:underline">
        ← Back to gallery
      </Link>
    </>
  );
}
