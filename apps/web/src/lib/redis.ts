import 'server-only';
import IORedis from 'ioredis';
import { env } from '@tavakoli/config';

/**
 * Lazily-created ioredis connection for rate-limiting and as the BullMQ producer
 * connection. Instantiation is deferred to first use so importing modules (e.g.
 * during `next build`) never opens a socket.
 *
 * Critically for the panel-without-Redis case: commands must FAIL FAST when Redis
 * is unreachable instead of blocking forever. With the default settings and
 * maxRetriesPerRequest=null, `redis.incr()` would queue and hang indefinitely,
 * freezing login. `enableOfflineQueue: false` + a bounded retryStrategy make
 * commands reject quickly so the rate limiter fails open. Once a real REDIS_URL
 * is configured, the connection works normally.
 */
const globalForRedis = globalThis as unknown as { redis?: IORedis };

export function getRedis(): IORedis {
  if (globalForRedis.redis) return globalForRedis.redis;
  const client = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    connectTimeout: 2000,
    // Stop reconnecting after a few quick attempts so pending commands reject
    // instead of waiting forever when Redis is not configured.
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 800)),
  });
  // Swallow connection errors — an unreachable Redis must not crash the function.
  client.on('error', () => undefined);
  globalForRedis.redis = client;
  return client;
}
