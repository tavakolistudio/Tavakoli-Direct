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
 */
export async function rateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
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
}

/** Clear a rate-limit counter (e.g. after a successful login). */
export async function clearRateLimit(key: string): Promise<void> {
  await getRedis().del(`rl:${key}`);
}
