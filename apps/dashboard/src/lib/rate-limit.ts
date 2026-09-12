/**
 * Minimal in-process sliding-window rate limiter. Scoped to a single Node
 * process — correct for the single-instance `dashboard` service in
 * docker-compose.yml. If this is ever horizontally scaled behind a load
 * balancer, move the counter store to Redis (already provisioned in
 * docker-compose.yml as `redis` but not yet wired to the app) so limits are
 * shared across instances — see docs/PRODUCTION_READINESS.md.
 */
interface Bucket {
  count: number;
  windowStartMs: number;
}

const buckets = new Map<string, Bucket>();

// Bound memory: drop stale buckets so a flood of distinct keys can't grow
// this map unboundedly. Cheap opportunistic sweep, not a background timer.
function sweep(nowMs: number, windowMs: number) {
  if (buckets.size < 10_000) return;
  for (const [key, bucket] of buckets) {
    if (nowMs - bucket.windowStartMs > windowMs) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now, windowMs);

  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStartMs > windowMs) {
    buckets.set(key, { count: 1, windowStartMs: now });
    return { allowed: true, remaining: maxAttempts - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > maxAttempts) {
    const retryAfterSeconds = Math.ceil((bucket.windowStartMs + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }
  return { allowed: true, remaining: maxAttempts - bucket.count, retryAfterSeconds: 0 };
}

/** Best-effort client identifier from standard proxy headers, falling back
 * to a constant so at least per-process-wide limiting still applies behind
 * a proxy that doesn't forward the client IP. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
