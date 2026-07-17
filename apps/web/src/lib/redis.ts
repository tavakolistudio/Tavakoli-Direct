import 'server-only';
import IORedis from 'ioredis';
import { env } from '@tavakoli/config';

/**
 * Lazily-created ioredis connection for rate-limiting and as the BullMQ
 * connection. Instantiation is deferred to first use so that importing modules
 * (e.g. during `next build` page-data collection) never touches env or opens a
 * socket. BullMQ requires maxRetriesPerRequest = null.
 */
const globalForRedis = globalThis as unknown as { redis?: IORedis };

export function getRedis(): IORedis {
  if (globalForRedis.redis) return globalForRedis.redis;
  const client = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
  globalForRedis.redis = client;
  return client;
}
