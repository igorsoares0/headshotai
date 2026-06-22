/**
 * Order persistence, backed by Postgres via Prisma (reqs §27). The per-image
 * `shots` array, `styles` and `referenceUrls` live in JSON columns — they're
 * always handled together with the order, never queried individually. The app's
 * Order/Shot types are intentionally kept independent of Prisma's generated
 * types and mapped at this boundary (e.g. createdAt stays epoch-ms).
 */
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "./prisma";
import type { StyleKey } from "./recipe";

export type OrderStatus =
  | "training"
  | "generating"
  | "gating"
  | "scoring"
  | "upscaling"
  | "ready"
  | "failed";

export interface Shot {
  id: string; // generation prediction id
  style: StyleKey;
  idx: number;
  seed: number;
  status: string; // generation prediction status
  url?: string; // replicate output url (expires)
  file?: string; // local path served under /generated/<orderId>/
  predictTime?: number;
  matchIds?: string[]; // face-match prediction ids, one per reference (max wins)
  similarity?: number | null; // resolved gate score (best across references)
  pass?: boolean; // cleared the identity gate
  aestheticId?: string; // aesthetic-score prediction id
  aesthetic?: number | null; // 1-10 aesthetic score (null = scoring failed)
  safetyId?: string; // nsfw-classifier prediction id
  nsfw?: boolean; // flagged unsafe → excluded from delivery
  phash?: string; // 64-char average-hash bit string for near-duplicate detection
  delivered?: boolean; // selected (top-N by combined score) for delivery to the user
  upscaleId?: string; // upscale prediction id (delivered shots only)
  upscaledUrl?: string; // replicate upscaled output url (expires)
  upscaledFile?: string; // local path to the 2K file; falls back to `file` on failure
}

export interface Order {
  id: string;
  userId: string; // owner (auth user id) — orders are scoped per user
  createdAt: number; // epoch ms
  status: OrderStatus;
  packId: string;
  targetCount: number; // delivered photos promised by the pack
  subject?: string; // prompt anchor, e.g. "Latino man" (reqs §12/§14); legacy orders: undefined
  styles: StyleKey[];
  trainingId: string;
  destination: string;
  trainedVersion?: string;
  referenceUrls: string[];
  photoCount: number;
  trainSeconds?: number;
  genSeconds: number;
  shots: Shot[];
  error?: string;
}

// Row shape as returned by Prisma (Json columns come back as JsonValue).
type OrderRow = Prisma.OrderGetPayload<object>;

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    userId: row.userId,
    createdAt: row.createdAt.getTime(),
    status: row.status as OrderStatus,
    packId: row.packId,
    targetCount: row.targetCount,
    subject: row.subject ?? undefined,
    styles: row.styles as unknown as StyleKey[],
    trainingId: row.trainingId,
    destination: row.destination,
    trainedVersion: row.trainedVersion ?? undefined,
    referenceUrls: row.referenceUrls as unknown as string[],
    photoCount: row.photoCount,
    trainSeconds: row.trainSeconds ?? undefined,
    genSeconds: row.genSeconds,
    shots: row.shots as unknown as Shot[],
    error: row.error ?? undefined,
  };
}

// Column values for create/update (everything except the id).
function toRow(o: Order) {
  return {
    userId: o.userId,
    createdAt: new Date(o.createdAt),
    status: o.status,
    packId: o.packId,
    targetCount: o.targetCount,
    subject: o.subject ?? null,
    styles: o.styles as unknown as Prisma.InputJsonValue,
    trainingId: o.trainingId,
    destination: o.destination,
    trainedVersion: o.trainedVersion ?? null,
    referenceUrls: o.referenceUrls as unknown as Prisma.InputJsonValue,
    photoCount: o.photoCount,
    trainSeconds: o.trainSeconds ?? null,
    genSeconds: o.genSeconds,
    shots: o.shots as unknown as Prisma.InputJsonValue,
    error: o.error ?? null,
  };
}

export async function getOrder(id: string): Promise<Order | null> {
  const row = await prisma.order.findUnique({ where: { id } });
  return row ? toOrder(row) : null;
}

export async function listOrders(userId?: string): Promise<Order[]> {
  const rows = await prisma.order.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toOrder);
}

export async function saveOrder(order: Order): Promise<void> {
  const data = toRow(order);
  await prisma.order.upsert({
    where: { id: order.id },
    create: { id: order.id, ...data },
    update: data,
  });
}

export function newOrderId(): string {
  return "ord_" + Math.random().toString(36).slice(2, 10);
}
