import IORedis from 'ioredis';
import { env } from '@tavakoli/config';

/** Shared BullMQ connection. maxRetriesPerRequest must be null for BullMQ. */
export const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
