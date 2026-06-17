import { Topbar } from "@/app/dashboard/_components/topbar";
import { galleryShots } from "@/lib/view";
import { GalleryClient } from "./gallery-client";

export const dynamic = "force-dynamic";

export default function GalleryPage() {
  const shots = galleryShots();
  const categories = ["All", ...Array.from(new Set(shots.map((s) => s.styleLabel)))];

  return (
    <>
      <Topbar title="Gallery" subtitle={`${shots.length} delivered headshots`} />
      <div className="px-5 py-8 sm:px-8">
        {shots.length === 0 ? (
          <div className="grid place-items-center rounded-card border border-dashed border-line-strong bg-paper-raised py-24 text-center">
            <p className="text-muted">No headshots yet — finish a batch to see them here.</p>
          </div>
        ) : (
          <GalleryClient shots={shots} categories={categories} />
        )}
      </div>
    </>
  );
}
