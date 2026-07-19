/**
 * Outbound-message processor: the ONLY place provider send calls happen. Loads a
 * queued OutboundJob, sends via the configured provider, and records the result.
 * Idempotent: a job already SUCCEEDED is never re-sent. Errors are mapped to
 * categories; retryable ones are re-thrown so BullMQ retries with backoff.
 */
import { mapProviderError } from '@tavakoli/core';
import { decryptSecret, prisma, type MessageType } from '@tavakoli/database';
import {
  getProvider,
  type QuickReply,
  type SendResult,
  type TemplateButton,
} from '@tavakoli/integrations';
import { log } from '../log';

interface JobData {
  outboundJobId: string;
  idempotencyKey: string;
}

export async function processOutboundMessage(data: JobData): Promise<void> {
  const job = await prisma.outboundJob.findUnique({ where: { id: data.outboundJobId } });
  if (!job) return;
  if (job.status === 'SUCCEEDED') return; // idempotent — never double-send

  await prisma.outboundJob.update({
    where: { id: job.id },
    data: { status: 'PROCESSING', attempts: { increment: 1 } },
  });

  const account = await prisma.instagramAccount.findUnique({
    where: { id: job.instagramAccountId },
    include: { credential: true },
  });
  if (!account) {
    await fail(job.id, 'PROVIDER_PERMANENT', 'account missing', false);
    return;
  }

  const provider = getProvider();
  const accessToken =
    provider.name === 'meta' && account.credential
      ? decryptSecret({
          ciphertext: account.credential.encryptedToken,
          iv: account.credential.tokenIv,
          authTag: account.credential.tokenAuthTag,
        })
      : undefined;

  const payload = job.payload as Record<string, string>;
  let result: SendResult;
  try {
    result = await send(provider, job.kind, account.providerAccountId, payload, accessToken);
  } catch (err) {
    // Network/unknown → treat as temporary so BullMQ retries.
    await fail(job.id, 'PROVIDER_TEMPORARY', (err as Error).message, true);
    throw err;
  }

  if (result.success) {
    await onSuccess(job, result);
    return;
  }

  const appErr = mapProviderError(result.error ?? {});
  if (appErr.category === 'PROVIDER_AUTH') {
    await prisma.instagramAccount.update({
      where: { id: account.id },
      data: { tokenStatus: 'EXPIRED', status: 'ERROR', connectionError: 'Reconnect required' },
    });
  }
  if (job.conversationId && !appErr.retryable) {
    await prisma.conversation.update({
      where: { id: job.conversationId },
      data: { needsHuman: true, status: 'NEEDS_HUMAN', handoffReason: 'PROVIDER_ERROR' },
    });
  }

  await fail(job.id, appErr.category, appErr.message ?? 'send failed', appErr.retryable);
  if (appErr.retryable) throw new Error(`retryable provider error: ${appErr.category}`);
}

async function send(
  provider: ReturnType<typeof getProvider>,
  kind: string,
  providerAccountId: string,
  payload: Record<string, string>,
  accessToken?: string,
): Promise<SendResult> {
  switch (kind) {
    case 'sendText':
      return provider.sendText({
        providerAccountId,
        recipientScopedId: payload.recipientScopedId!,
        text: payload.text!,
        quickReplies: payload.quickReplies as unknown as QuickReply[] | undefined,
        buttons: payload.buttons as unknown as TemplateButton[] | undefined,
        accessToken,
      });
    case 'sendMedia':
      return provider.sendMedia({
        providerAccountId,
        recipientScopedId: payload.recipientScopedId!,
        mediaUrl: payload.mediaUrl!,
        caption: payload.caption,
        mediaType: payload.mediaType as 'image' | 'audio' | 'video' | undefined,
        accessToken,
      });
    case 'privateReply':
      return provider.sendPrivateReply({
        providerAccountId,
        commentId: payload.commentId!,
        text: payload.text!,
        quickReplies: payload.quickReplies as unknown as QuickReply[] | undefined,
        buttons: payload.buttons as unknown as TemplateButton[] | undefined,
        accessToken,
      });
    case 'hideComment':
      return provider.hideComment({ commentId: payload.commentId!, accessToken });
    case 'publicCommentReply':
      return provider.sendPublicCommentReply({
        providerAccountId,
        commentId: payload.commentId!,
        text: payload.text!,
        accessToken,
      });
    default:
      return { success: false, error: { message: `unknown kind ${kind}` } };
  }
}

async function onSuccess(
  job: {
    id: string;
    conversationId: string | null;
    kind: string;
    payload: unknown;
    correlationId: string | null;
  },
  result: SendResult,
): Promise<void> {
  await prisma.outboundJob.update({
    where: { id: job.id },
    data: {
      status: 'SUCCEEDED',
      providerMessageId: result.providerMessageId,
      processedAt: new Date(),
    },
  });

  // Record the outbound message so it appears in the inbox (deduped by provider id).
  if (job.conversationId) {
    const payload = job.payload as { text?: string };
    const type: MessageType = job.kind === 'sendMedia' ? 'IMAGE' : 'TEXT';
    await prisma.message
      .create({
        data: {
          conversationId: job.conversationId,
          direction: 'OUTBOUND',
          type,
          senderType: 'AUTOMATION',
          body: payload.text ?? null,
          providerMessageId: result.providerMessageId,
          deliveryStatus: 'SENT',
          automationExecutionId: job.correlationId,
        },
      })
      .catch(() => undefined);
    await prisma.conversation.update({
      where: { id: job.conversationId },
      data: { lastMessageAt: new Date() },
    });
  }
  log.info('outbound sent', { jobId: job.id, kind: job.kind });
}

async function fail(
  jobId: string,
  category: string,
  detail: string,
  retryable: boolean,
): Promise<void> {
  await prisma.outboundJob.update({
    where: { id: jobId },
    data: {
      status: retryable ? 'FAILED' : 'DEAD',
      errorCategory: category,
      errorDetail: detail.slice(0, 500),
    },
  });
  log.warn('outbound failed', { jobId, category, retryable });
}
