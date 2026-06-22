/**
 * Server-side view models — maps stored orders (lib/store) into the shapes the
 * dashboard screens render. Keeps fs access on the server; client components
 * receive these as plain-serializable props.
 */
import { listOrders, type Order } from "./store";
import { STYLES, type StyleKey } from "./recipe";

const STATUS_LABEL: Record<Order["status"], string> = {
  training: "TRAINING",
  generating: "GENERATING",
  gating: "REVIEWING",
  scoring: "SELECTING",
  upscaling: "UPSCALING",
  ready: "READY",
  failed: "FAILED",
};

const IN_PROGRESS: Order["status"][] = [
  "training",
  "generating",
  "gating",
  "scoring",
  "upscaling",
];

// A shot counts as delivered if it was selected (top-N) — falling back to the
// gate result for orders created before per-pack delivery selection existed.
function isDelivered(s: Order["shots"][number]): boolean {
  return (s.delivered ?? s.pass) === true;
}

function pkgName(id: string): string {
  return id ? id.charAt(0).toUpperCase() + id.slice(1) : "—";
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export interface OrderRow {
  id: string;
  pkgName: string;
  date: string;
  statusLabel: string;
  rawStatus: Order["status"];
  delivered: number;
  total: number;
}

export async function orderRows(userId: string): Promise<OrderRow[]> {
  return (await listOrders(userId)).map((o) => ({
    id: o.id,
    pkgName: pkgName(o.packId),
    date: fmtDate(o.createdAt),
    statusLabel: STATUS_LABEL[o.status],
    rawStatus: o.status,
    delivered: o.shots.filter(isDelivered).length,
    total: o.shots.length,
  }));
}

export interface GalleryShot {
  id: string;
  orderId: string;
  file: string;
  styleLabel: string;
  styleKey: StyleKey;
  score: number; // 0-100
}

export async function galleryShots(userId: string): Promise<GalleryShot[]> {
  const out: GalleryShot[] = [];
  for (const o of await listOrders(userId)) {
    for (const s of o.shots) {
      if (isDelivered(s) && s.file) {
        out.push({
          id: `${o.id}_${s.style}_${s.idx}`,
          orderId: o.id,
          file: s.upscaledFile ?? s.file, // serve the 2K version when ready

          styleLabel: STYLES[s.style]?.label ?? s.style,
          styleKey: s.style,
          score: s.similarity != null ? Math.round(s.similarity * 100) : 0,
        });
      }
    }
  }
  return out;
}

export async function dashboardStats(userId: string) {
  const orders = await listOrders(userId);
  const shots = orders.flatMap((o) => o.shots);
  return {
    orders: orders.length,
    delivered: shots.filter(isDelivered).length,
    inProgress: orders.filter((o) => IN_PROGRESS.includes(o.status)).length,
    ready: orders.filter((o) => o.status === "ready").length,
  };
}

export async function activeOrder(userId: string): Promise<Order | null> {
  return (await listOrders(userId)).find((o) => IN_PROGRESS.includes(o.status)) ?? null;
}
