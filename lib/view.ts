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
  ready: "READY",
  failed: "FAILED",
};

const IN_PROGRESS: Order["status"][] = ["training", "generating", "gating"];

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

export function orderRows(): OrderRow[] {
  return listOrders().map((o) => ({
    id: o.id,
    pkgName: pkgName(o.packId),
    date: fmtDate(o.createdAt),
    statusLabel: STATUS_LABEL[o.status],
    rawStatus: o.status,
    delivered: o.shots.filter((s) => s.pass).length,
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

export function galleryShots(): GalleryShot[] {
  const out: GalleryShot[] = [];
  for (const o of listOrders()) {
    for (const s of o.shots) {
      if (s.pass && s.file) {
        out.push({
          id: `${o.id}_${s.style}_${s.idx}`,
          orderId: o.id,
          file: s.file,
          styleLabel: STYLES[s.style]?.label ?? s.style,
          styleKey: s.style,
          score: s.similarity != null ? Math.round(s.similarity * 100) : 0,
        });
      }
    }
  }
  return out;
}

export function dashboardStats() {
  const orders = listOrders();
  const shots = orders.flatMap((o) => o.shots);
  return {
    orders: orders.length,
    delivered: shots.filter((s) => s.pass).length,
    inProgress: orders.filter((o) => IN_PROGRESS.includes(o.status)).length,
    ready: orders.filter((o) => o.status === "ready").length,
  };
}

export function activeOrder(): Order | null {
  return listOrders().find((o) => IN_PROGRESS.includes(o.status)) ?? null;
}
