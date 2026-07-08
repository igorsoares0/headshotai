import "server-only";
import { headers } from "next/headers";

/**
 * Fixed-window rate limiter, in-process. Guards the auth surface (login, signup,
 * password reset, verification resend) against brute-force and email-abuse.
 *
 * Scope note: state lives in this process's memory, so it protects a single
 * instance and resets on redeploy. That's enough for a small/single-node
 * deployment; a horizontally-scaled prod should back this with a shared store
 * (Upstash/Redis) keyed the same way. Swapping the store is a change to this one
 * file — callers only see `checkRateLimit`.
 */
interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

// Periodically drop expired windows so the map can't grow without bound under a
// spray of distinct keys (e.g. many IPs). Unref so it never keeps the process up.
const SWEEP_MS = 10 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, w] of buckets) if (w.resetAt <= now) buckets.delete(key);
}, SWEEP_MS).unref?.();

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

/**
 * Count one hit against `key` and report whether it's within `limit` per
 * `windowMs`. Fails OPEN on any internal error — a limiter bug must never lock
 * legitimate users out of auth.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  try {
    const now = Date.now();
    const existing = buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { ok: true, retryAfterSeconds: 0 };
    }
    existing.count += 1;
    if (existing.count > limit) {
      return { ok: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
    }
    return { ok: true, retryAfterSeconds: 0 };
  } catch {
    return { ok: true, retryAfterSeconds: 0 };
  }
}

/**
 * Best-effort client IP from the proxy headers Next sets. Falls back to a shared
 * "unknown" bucket when absent — worst case that throttles a set of anonymous
 * callers together, which is acceptable for an abuse guard.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Convenience wrapper for the auth actions: throttle `action` by client IP
 * (optionally further scoped, e.g. by email). Returns a user-facing message when
 * the limit is hit, or null when the call may proceed.
 */
export async function checkAuthRateLimit(
  action: string,
  opts: { limit: number; windowMs: number; scope?: string } = { limit: 10, windowMs: 60_000 },
): Promise<string | null> {
  const ip = await clientIp();
  const key = `${action}:${ip}${opts.scope ? `:${opts.scope}` : ""}`;
  const res = rateLimit(key, opts.limit, opts.windowMs);
  if (res.ok) return null;
  const mins = Math.max(1, Math.ceil(res.retryAfterSeconds / 60));
  return `Too many attempts. Please try again in ${mins} minute${mins === 1 ? "" : "s"}.`;
}
