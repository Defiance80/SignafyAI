/**
 * In-memory rate limiter — swap inner store for Upstash Redis in production.
 *
 * Usage:
 *   const ok = await rateLimit(`leads:discover:${orgId}`, 5, 60); // 5 req/min
 *   if (!ok) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 });
 */

interface BucketEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, BucketEntry>();

// Prune expired entries every 5 min so Map doesn't grow forever
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store) {
      if (v.resetAt < now) store.delete(k);
    }
  }, 5 * 60 * 1000);
}

/**
 * Returns true if the request is within the limit, false if rate-limited.
 * @param key    Unique rate-limit key (e.g. "leads:discover:org-uuid")
 * @param limit  Max requests allowed per window
 * @param windowSec  Window size in seconds
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const now = Date.now();
  const resetAt = now + windowSec * 1000;
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count += 1;
  return true;
}

/** Pre-defined limiters for expensive operations */
export const LIMITS = {
  /** Lead discovery: 10 runs per hour per org */
  leadDiscovery: (orgId: string) => rateLimit(`leads:discover:${orgId}`, 10, 3600),
  /** Content generation: 50 per hour per org */
  contentGenerate: (orgId: string) => rateLimit(`content:generate:${orgId}`, 50, 3600),
  /** SEO research: 20 per hour per org */
  seoResearch: (orgId: string) => rateLimit(`seo:research:${orgId}`, 20, 3600),
  /** General API: 200 per minute per org */
  api: (orgId: string) => rateLimit(`api:general:${orgId}`, 200, 60),
};
