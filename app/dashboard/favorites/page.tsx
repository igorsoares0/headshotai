import Link from "next/link";
import { Topbar } from "@/app/dashboard/_components/topbar";
import { Portrait } from "@/app/components/portrait";
import { gallery } from "@/lib/data";

const favorites = gallery.filter((s) => s.favorite);

export default function FavoritesPage() {
  return (
    <>
      <Topbar title="Favorites" subtitle="Your bookmarked headshots" />

      <div className="px-5 py-8 sm:px-8">
        {favorites.length === 0 ? (
          <div className="grid place-items-center rounded-card border border-dashed border-line-strong bg-paper-raised py-24 text-center">
            <p className="text-muted">No favorites yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {favorites.map((shot) => (
              <div
                key={shot.id}
                className="group relative overflow-hidden rounded-card border border-line"
              >
                <Portrait seed={shot.seed} className="aspect-[4/5] w-full" label={shot.style} />
                <span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-electric text-white">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18.8 6.2 21.8l1.1-6.5L2.6 9.8l6.5-.9z" />
                  </svg>
                </span>
              </div>
            ))}
          </div>
        )}

        <Link
          href="/dashboard/gallery"
          className="mt-6 inline-block text-sm font-medium text-electric hover:underline"
        >
          ← Back to gallery
        </Link>
      </div>
    </>
  );
}
