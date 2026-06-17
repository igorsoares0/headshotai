import { advanceOrder } from "@/lib/pipeline";
import { getOrder } from "@/lib/store";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = getOrder(id);
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });

  // each poll advances the lifecycle one step (training → … → ready)
  const advanced = await advanceOrder(order);
  return Response.json(advanced);
}
