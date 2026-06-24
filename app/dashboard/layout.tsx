import { getActivePurchase } from "@/lib/entitlement";
import { packById } from "@/lib/packs";
import { getUser } from "@/lib/dal";
import { Sidebar } from "@/app/dashboard/_components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read from the DB (not the JWT) so a profile name change shows up immediately.
  const dbUser = await getUser();
  const user = { name: dbUser.name ?? null, email: dbUser.email ?? null };

  const purchase = await getActivePurchase(dbUser.id);
  const activePack = purchase ? (packById(purchase.packId)?.name ?? "Pack") : null;

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar user={user} activePack={activePack} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
