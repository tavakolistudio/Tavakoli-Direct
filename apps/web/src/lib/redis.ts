import 'server-only';
import IORedis from 'ioredis';
import { env } from '@tavakoli/config';

/**
 * Shared ioredis connection for rate-limiting and as the BullMQ connection.
 * BullMQ requires maxRetriesPerRequest = null.
 */
const globalForRedis = globalThis as unknown as { redis?: IORedis };

export const redis: IORedis =
  globalForRedis.redis ??
  // lazyConnect avoids a connection attempt at import time (e.g. during builds).
  new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });

if (env.NODE_ENV !== 'production') globalForRedis.redis = redis;
