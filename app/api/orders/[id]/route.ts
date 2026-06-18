import { auth } from "@/auth";
import { advanceOrder } from "@/lib/pipeline";
import { getOrder } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await getOrder(id);
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
  if (order.userId !== session.user.id)
    return Response.json({ error: "Forbidden" }, { status: 403 });

  // each poll advances the lifecycle one step (training → … → ready)
  const advanced = await advanceOrder(order);
  return Response.json(advanced);
}
