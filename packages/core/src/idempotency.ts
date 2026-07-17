/**
 * Idempotency helpers. A deterministic key derived from the event's identity is
 * used to reject duplicate webhook processing and to prevent duplicate outbound
 * sends after a successful provider response.
 */
import { createHash } from 'node:crypto';
import type { NormalizedInstagramEvent } from './types';

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Build an idempotency key for an inbound event. Prefers the provider message id
 * (globally unique), falling back to a composite of stable fields for events
 * that lack one (e.g. comments identified by comment id).
 */
export function webhookIdempotencyKey(event: NormalizedInstagramEvent): string {
  const identity =
    event.providerMessageId ??
    event.commentId ??
    [event.kind, event.providerAccountId, event.senderScopedId, event.providerTimestamp, event.text]
      .map((v) => v ?? '')
      .join('|');
  return sha256(`${event.kind}:${identity}`);
}

/**
 * Build an idempotency key for an outbound job so retries of the same logical
 * send never produce duplicate messages.
 */
export function outboundIdempotencyKey(params: {
  automationExecutionId?: string;
  conversationId: string;
  stepIndex?: number;
  kind: string;
  contentHashSource: string;
}): string {
  const base = [
    params.automationExecutionId ?? 'manual',
    params.conversationId,
    params.stepIndex ?? 0,
    params.kind,
    params.contentHashSource,
  ].join('|');
  return sha256(base);
}
