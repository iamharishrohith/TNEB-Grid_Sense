// ═══════════════════════════════════════════════════════════════════
//  TN-GridSense Backend — Token Bucket Rate Limiter (Phase 2)
// ═══════════════════════════════════════════════════════════════════

interface Bucket {
    tokens: number;
    lastRefill: number;
}

const buckets: Map<string, Bucket> = new Map();

// Auto-cleanup stale entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
        if (now - bucket.lastRefill > 10 * 60 * 1000) {
            buckets.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * Token bucket rate limiter.
 * @param key     Unique identifier (e.g., IP address)
 * @param maxTokens  Maximum tokens in bucket (burst capacity)
 * @param refillRate Tokens added per second
 * @returns true if request is allowed, false if rate-limited
 */
export function checkRateLimit(
    key: string,
    maxTokens: number = 100,
    refillRate: number = 1.67 // ~100/min
): boolean {
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket) {
        bucket = { tokens: maxTokens, lastRefill: now };
        buckets.set(key, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsed = (now - bucket.lastRefill) / 1000; // seconds
    bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsed * refillRate);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return true; // Allowed
    }

    return false; // Rate limited
}

/**
 * Elysia-compatible rate limit guard.
 * Returns an error response object if rate-limited, or null if allowed.
 */
export function rateLimitGuard(
    ip: string,
    maxTokens: number = 100,
    refillRate: number = 1.67
): { error: string; retryAfter: number } | null {
    if (!checkRateLimit(ip, maxTokens, refillRate)) {
        return {
            error: "Too Many Requests — Rate limit exceeded",
            retryAfter: Math.ceil(1 / refillRate),
        };
    }
    return null;
}
