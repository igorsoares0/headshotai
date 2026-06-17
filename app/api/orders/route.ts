import type { NextRequest } from "next/server";
import { startOrder, type UploadInput } from "@/lib/pipeline";
import { listOrders } from "@/lib/store";

export const runtime = "nodejs"; // needs fs + sharp

export async function GET() {
  return Response.json(listOrders());
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const files = form.getAll("photos").filter((f): f is File => f instanceof File);
  const packId = (form.get("packId") as string) || "professional";

  if (files.length < 10) {
    return Response.json({ error: "Upload at least 10 photos." }, { status: 400 });
  }
  if (files.length > 25) {
    return Response.json({ error: "Upload at most 25 photos." }, { status: 400 });
  }

  try {
    const inputs: UploadInput[] = await Promise.all(
      files.map(async (f) => ({
        buffer: Buffer.from(await f.arrayBuffer()),
        name: f.name,
        type: f.type,
      })),
    );
    const order = await startOrder(inputs, packId);
    return Response.json({ id: order.id }, { status: 201 });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to start order" },
      { status: 500 },
    );
  }
}
