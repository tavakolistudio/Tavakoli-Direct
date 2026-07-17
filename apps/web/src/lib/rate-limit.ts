import 'server-only';
import { getRedis } from './redis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
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
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }
    const ttl = await redis.ttl(redisKey);
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
    await getRedis().del(`rl:${key}`);
  } catch {
    // Redis unavailable — nothing to clear.
  }
}
