import { Topbar } from "@/app/dashboard/_components/topbar";
import { galleryShots } from "@/lib/view";
import { requireUserId } from "@/lib/dal";
import { FavoritesClient } from "./favorites-client";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const shots = galleryShots(await requireUserId());
  return (
    <>
      <Topbar title="Favorites" subtitle="Your bookmarked headshots" />
      <div className="px-5 py-8 sm:px-8">
        <FavoritesClient shots={shots} />
      </div>
    </>
  );
}
