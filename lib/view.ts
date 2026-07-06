/**
 * Server-side view models — maps stored orders (lib/store) into the shapes the
 * dashboard screens render. This is where stored R2 object keys become
 * presigned URLs; client components only ever receive signed, time-limited
 * URLs as plain-serializable props.
 */
import { listOrders, type Order } from "./store";
import { STYLES, type StyleKey } from "./recipe";
import { isR2Key, r2SignGet } from "./r2";

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
  file: string; // presigned display URL
  downloadUrl: string; // presigned attachment URL (`download` attr is ignored cross-origin)
  styleLabel: string;
  styleKey: StyleKey;
  score: number; // 0-100
}

export async function galleryShots(userId: string): Promise<GalleryShot[]> {
  const out: GalleryShot[] = [];
  for (const o of await listOrders(userId)) {
    for (const s of o.shots) {
      const key = s.upscaledFile ?? s.file; // serve the 2K version when ready
      // pre-R2 dev orders hold `/generated/...` disk paths — skip them
      if (!isDelivered(s) || !isR2Key(key)) continue;
      out.push({
        id: `${o.id}_${s.style}_${s.idx}`,
        orderId: o.id,
        file: await r2SignGet(key),
        downloadUrl: await r2SignGet(key, { downloadName: `${s.style}_${s.idx}.jpg` }),
        styleLabel: STYLES[s.style]?.label ?? s.style,
        styleKey: s.style,
        score: s.similarity != null ? Math.round(s.similarity * 100) : 0,
      });
    }
  }
  return out;
}

/**
 * Serialize an order for the client: stored R2 keys become presigned URLs
 * (legacy disk paths → undefined, so the UI shows its missing-image
 * placeholder). Returns a copy — the in-memory order may still be saved by the
 * pipeline, and signed URLs must never reach saveOrder. Reference keys are
 * internal and stripped.
 */
export async function toClientOrder(order: Order): Promise<Order> {
  return {
    ...order,
    referenceUrls: [],
    shots: await Promise.all(
      order.shots.map(async (s) => ({
        ...s,
        url: undefined,
        upscaledUrl: undefined,
        file: isR2Key(s.file) ? await r2SignGet(s.file) : undefined,
        upscaledFile: isR2Key(s.upscaledFile) ? await r2SignGet(s.upscaledFile) : undefined,
      })),
    ),
  };
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
