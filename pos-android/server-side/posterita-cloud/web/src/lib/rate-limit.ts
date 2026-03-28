/**
 * Simple in-memory rate limiter for API routes.
 * Limits requests per IP per window (sliding window counter).
 *
 * For Vercel serverless: each cold start gets a fresh map,
 * so this is best-effort — not a hard guarantee.
 * For stricter limits, use Vercel Edge Config or Upstash Redis.
 */

const windowMs = 60 * 1000; // 1 minute window
const store = new Map<string, { count: number; resetAt: number }>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of store) {
    if (now > val.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Check if a request should be rate limited.
 * @param key Unique identifier (IP + route)
 * @param limit Max requests per window
 * @returns { limited: boolean, remaining: number }
 */
export function checkRateLimit(
  key: string,
  limit: number = 60
): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count++;
  if (entry.count > limit) {
    return { limited: true, remaining: 0, resetAt: entry.resetAt };
  }

  return { limited: false, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Get client IP from request headers (Vercel sets x-forwarded-for).
 */
export function getClientIp(headers: any): string {
  if (!headers || typeof headers.get !== "function") return "unknown";
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headers.get("x-real-ip")
    || "unknown";
}
