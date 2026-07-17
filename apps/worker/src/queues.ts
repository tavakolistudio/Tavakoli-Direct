import { Queue } from 'bullmq';
import { OUTBOUND_JOB_POLICY, QUEUE_NAMES } from '@tavakoli/config';
import { connection } from './redis';

/** Producer for outbound-message jobs (webhook processor enqueues these). */
export const outboundQueue = new Queue(QUEUE_NAMES.outboundMessages, { connection });

export async function enqueueOutbound(
  outboundJobId: string,
  idempotencyKey: string,
): Promise<void> {
  await outboundQueue.add(
    'send',
    { outboundJobId, idempotencyKey },
    {
      jobId: idempotencyKey,
      attempts: OUTBOUND_JOB_POLICY.attempts,
      backoff: { type: OUTBOUND_JOB_POLICY.backoffType, delay: OUTBOUND_JOB_POLICY.backoffDelayMs },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  );
}
