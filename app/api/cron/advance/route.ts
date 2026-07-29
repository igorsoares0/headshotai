import { createHash, timingSafeEqual } from "node:crypto";
import { advanceOrder } from "@/lib/pipeline";
import { listActiveOrders } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-side driver for the order lifecycle.
 *
 * Without this, the only things that call `advanceOrder` are the order-detail
 * page's poll and (when WEBHOOK_BASE_URL is set) Replicate's webhook — so a
 * customer who closes the tab during the ~25min training leaves their paid batch
 * frozen, and never gets the "your photos are ready" email, because that too is
 * sent from inside `advanceOrder`. A scheduler hitting this route every minute or
 * two makes delivery independent of the browser.
 *
 * Safe to run alongside polling and webhooks: `advanceOrder` serializes ticks per
 * order and every step is idempotent (predictions are created once and then
 * resolved by id), so a concurrent trigger is a no-op rather than a double-spend.
 *
 * Wire it up in DEPLOY.md; auth is a bearer token in CRON_SECRET.
 */

// Orders per run. The sweep is sequential and each order does real network work,
// so this bounds how long one request can take. Anything left over is picked up
// by the next run.
const MAX_PER_RUN = 20;
// Past this, an order isn't "in flight" any more — it's stuck (a Replicate
// prediction that never resolved, a bug). Skip it so a permanently broken order
// can't eat every run's budget forever, and let the log line be the signal to go
// look. Deliberately NOT auto-failed: that decision costs a customer their pack.
const STALE_MS = 24 * 60 * 60 * 1000;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // No secret configured → the endpoint stays shut. An open trigger would let
  // anyone drive Replicate calls on our account.
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : header;
  // Hash both sides so timingSafeEqual gets equal-length buffers regardless of
  // what was presented (it throws otherwise, and the length itself leaks).
  const a = createHash("sha256").update(presented).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorized(request)) return new Response("unauthorized", { status: 401 });

  const orders = await listActiveOrders(MAX_PER_RUN);
  const now = Date.now();
  let advanced = 0;
  let stale = 0;
  const finished: string[] = [];

  // Sequential on purpose: each tick can hold several images in memory (download
  // → sharp → R2), and this shares a single-instance process with live requests.
  for (const order of orders) {
    if (now - order.createdAt > STALE_MS) {
      stale++;
      console.error(
        `[cron] order ${order.id} stuck in "${order.status}" for ${Math.round((now - order.createdAt) / 3600_000)}h — skipping, needs a look`,
      );
      continue;
    }
    try {
      const next = await advanceOrder(order);
      advanced++;
      if (next.status === "ready" || next.status === "failed") {
        finished.push(`${next.id}:${next.status}`);
      }
    } catch (err) {
      // advanceOrder already swallows per-tick errors; this is the outer net so
      // one bad order never aborts the sweep.
      console.error(
        `[cron] order ${order.id} failed to advance:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (finished.length) console.log(`[cron] finished: ${finished.join(", ")}`);

  return Response.json({ active: orders.length, advanced, stale, finished });
}
