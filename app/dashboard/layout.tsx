import { auth } from "@/auth";
import { getActivePurchase } from "@/lib/entitlement";
import { packById } from "@/lib/packs";
import { Sidebar } from "@/app/dashboard/_components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user
    ? { name: session.user.name ?? null, email: session.user.email ?? null }
    : null;

  const purchase = session?.user?.id ? await getActivePurchase(session.user.id) : null;
  const activePack = purchase ? (packById(purchase.packId)?.name ?? "Pack") : null;

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar user={user} activePack={activePack} />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
