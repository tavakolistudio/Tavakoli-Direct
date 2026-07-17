import 'server-only';
import { Queue } from 'bullmq';
import { OUTBOUND_JOB_POLICY, QUEUE_NAMES } from '@tavakoli/config';
import { redis } from './redis';

/**
 * BullMQ producers. The web app only enqueues; the worker consumes. Queues are
 * created lazily and reused across requests.
 */
const globalForQueues = globalThis as unknown as { tdQueues?: Map<string, Queue> };
const queues = globalForQueues.tdQueues ?? new Map<string, Queue>();
globalForQueues.tdQueues = queues;

function getQueue(name: string): Queue {
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, { connection: redis });
    queues.set(name, q);
  }
  return q;
}

/** Enqueue a raw webhook event for async processing. */
export async function enqueueWebhookEvent(data: {
  webhookEventId: string;
  idempotencyKey: string;
}): Promise<void> {
  await getQueue(QUEUE_NAMES.webhookEvents).add('process', data, {
    jobId: data.idempotencyKey,
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  });
}

/** Enqueue an outbound provider message (idempotent by key). */
export async function enqueueOutboundJob(data: {
  outboundJobId: string;
  idempotencyKey: string;
}): Promise<void> {
  await getQueue(QUEUE_NAMES.outboundMessages).add('send', data, {
    jobId: data.idempotencyKey,
    attempts: OUTBOUND_JOB_POLICY.attempts,
    backoff: { type: OUTBOUND_JOB_POLICY.backoffType, delay: OUTBOUND_JOB_POLICY.backoffDelayMs },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  });
}
