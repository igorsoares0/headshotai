import { Topbar } from "@/app/dashboard/_components/topbar";
import { galleryShots } from "@/lib/view";
import { FavoritesClient } from "./favorites-client";

export const dynamic = "force-dynamic";

export default function FavoritesPage() {
  return (
    <>
      <Topbar title="Favorites" subtitle="Your bookmarked headshots" />
      <div className="px-5 py-8 sm:px-8">
        <FavoritesClient shots={galleryShots()} />
      </div>
    </>
  );
}
