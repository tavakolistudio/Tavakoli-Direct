import 'server-only';
import { getRedis } from './redis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** Reject if the Redis operation does not settle quickly (unreachable Redis). */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  // Handle a late rejection so it never becomes an unhandled rejection once the
  // timeout has already won the race.
  p.catch(() => undefined);
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('redis timeout')), ms)),
  ]);
}

/**
 * Fixed-window rate limiter backed by Redis. Returns whether the action is
 * allowed and how many attempts remain in the current window.
 *
 * Fails open: if Redis is unreachable, the request is allowed (with a warning)
 * rather than blocking the user. This lets the panel run with only Postgres when
 * Redis has not been provisioned yet; brute-force protection resumes once Redis
 * is available.
 */
export async function rateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const redis = getRedis();
    const redisKey = `rl:${key}`;
    const count = await withTimeout(redis.incr(redisKey), 1500);
    if (count === 1) {
      await withTimeout(redis.expire(redisKey, windowSeconds), 1500);
    }
    const ttl = await withTimeout(redis.ttl(redisKey), 1500);
    const allowed = count <= maxAttempts;
    return {
      allowed,
      remaining: Math.max(0, maxAttempts - count),
      retryAfterSeconds: allowed ? 0 : Math.max(ttl, 0),
    };
  } catch (err) {
    console.warn('rateLimit: Redis unavailable, failing open', (err as Error).message);
    return { allowed: true, remaining: maxAttempts, retryAfterSeconds: 0 };
  }
}

/** Clear a rate-limit counter (e.g. after a successful login). Best-effort. */
export async function clearRateLimit(key: string): Promise<void> {
  try {
    await withTimeout(getRedis().del(`rl:${key}`), 1500);
  } catch {
    // Redis unavailable — nothing to clear.
  }
}
