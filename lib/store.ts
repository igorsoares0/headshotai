/**
 * Dead-simple JSON file store for orders. This is the MVP stand-in for the
 * database models in reqs §27 — enough to run the real flow end-to-end without
 * standing up Postgres yet. Single-process, single-user; swap for a DB later.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { StyleKey } from "./recipe";

export type OrderStatus = "training" | "generating" | "gating" | "ready" | "failed";

export interface Shot {
  id: string; // generation prediction id
  style: StyleKey;
  idx: number;
  seed: number;
  status: string; // generation prediction status
  url?: string; // replicate output url (expires)
  file?: string; // local path served under /generated/<orderId>/
  predictTime?: number;
  matchId?: string; // face-match prediction id
  similarity?: number | null; // resolved gate score
  pass?: boolean;
}

export interface Order {
  id: string;
  userId: string; // owner (auth user id) — orders are scoped per user
  createdAt: number;
  status: OrderStatus;
  packId: string;
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

const DATA_DIR = join(process.cwd(), ".data");
const FILE = join(DATA_DIR, "orders.json");

function readAll(): Record<string, Order> {
  if (!existsSync(FILE)) return {};
  try {
    return JSON.parse(readFileSync(FILE, "utf8")) as Record<string, Order>;
  } catch {
    return {};
  }
}

function writeAll(orders: Record<string, Order>): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(orders, null, 2));
}

export function getOrder(id: string): Order | null {
  return readAll()[id] ?? null;
}

export function listOrders(userId?: string): Order[] {
  return Object.values(readAll())
    .filter((o) => (userId ? o.userId === userId : true))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function saveOrder(order: Order): void {
  const all = readAll();
  all[order.id] = order;
  writeAll(all);
}

export function newOrderId(): string {
  return "ord_" + Math.random().toString(36).slice(2, 10);
}
