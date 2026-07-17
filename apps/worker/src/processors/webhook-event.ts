/**
 * Webhook-event processor: the async automation pipeline. Given a stored webhook
 * event, it records the inbound message + conversation, evaluates automations
 * deterministically, applies non-message actions, and enqueues outbound sends.
 * No provider calls happen here — those run in the outbound processor.
 */
import {
  evaluate,
  outboundIdempotencyKey,
  type AutomationDef,
  type EvaluationContext,
  type NormalizedInstagramEvent,
} from '@tavakoli/core';
import { prisma } from '@tavakoli/database';
import { enqueueOutbound } from '../queues';
import { toAutomationDef } from '../automation-map';
import { log } from '../log';

interface JobData {
  webhookEventId: string;
  idempotencyKey: string;
}

export async function processWebhookEvent(data: JobData): Promise<void> {
  const webhookEvent = await prisma.webhookEvent.findUnique({ where: { id: data.webhookEventId } });
  if (!webhookEvent) return;
  if (webhookEvent.status === 'PROCESSED') return; // idempotent

  const event = webhookEvent.rawPayload as unknown as NormalizedInstagramEvent;

  const account = await prisma.instagramAccount.findUnique({
    where: { providerAccountId: event.providerAccountId },
    include: {
      client: true,
      capabilities: true,
      automations: { where: { deletedAt: null }, include: { trigger: true, steps: true } },
    },
  });
  if (!account) {
    await markProcessed(webhookEvent.id, 'account not found');
    return;
  }

  // Handle non-message signals first.
  if (event.kind === 'TOKEN_EXPIRED') {
    await prisma.instagramAccount.update({
      where: { id: account.id },
      data: { tokenStatus: 'EXPIRED', status: 'ERROR', connectionError: 'Token expired' },
    });
    await markProcessed(webhookEvent.id, 'token expired');
    return;
  }
  if (event.kind === 'DELIVERY' || event.kind === 'READ') {
    if (event.providerMessageId) {
      await prisma.message.updateMany({
        where: { providerMessageId: event.providerMessageId },
        data: { deliveryStatus: event.kind === 'READ' ? 'READ' : 'DELIVERED' },
      });
    }
    await markProcessed(webhookEvent.id, 'delivery receipt');
    return;
  }

  await prisma.instagramAccount.update({
    where: { id: account.id },
    data: { lastWebhookAt: new Date() },
  });

  // Upsert contact.
  const contact = await prisma.contact.upsert({
    where: {
      instagramAccountId_scopedUserId: {
        instagramAccountId: account.id,
        scopedUserId: event.senderScopedId,
      },
    },
    update: { lastInteractionAt: new Date(), username: event.senderUsername ?? undefined },
    create: {
      clientId: account.clientId,
      instagramAccountId: account.id,
      scopedUserId: event.senderScopedId,
      username: event.senderUsername,
      sourcePostId: event.mediaId,
    },
  });

  // Find an open conversation or create one.
  const conversation =
    (await prisma.conversation.findFirst({
      where: { contactId: contact.id, status: { not: 'RESOLVED' } },
      orderBy: { lastMessageAt: 'desc' },
    })) ??
    (await prisma.conversation.create({
      data: {
        clientId: account.clientId,
        instagramAccountId: account.id,
        contactId: contact.id,
        status: 'OPEN',
      },
    }));

  // Record the inbound message.
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: 'INBOUND',
      type: event.kind === 'STORY_REPLY' ? 'STORY_REPLY' : 'TEXT',
      senderType: 'CONTACT',
      body: event.text ?? null,
      providerMessageId: event.providerMessageId ?? null,
      deliveryStatus: 'DELIVERED',
      providerTimestamp: event.providerTimestamp ? new Date(event.providerTimestamp) : null,
    },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), lastInboundAt: new Date() },
  });

  // Respect per-account and per-conversation automation pausing.
  if (!account.automationEnabled || conversation.automationPaused) {
    await markProcessed(webhookEvent.id, 'automation disabled/paused');
    return;
  }

  // Build evaluation inputs.
  const storyReplyAvailable = account.capabilities.some((c) => c.key === 'STORY_REPLY' && c.available);
  const activeAutomations = account.automations.filter((a) => a.status === 'ACTIVE' || a.trigger?.type === 'NO_RULE_MATCHED');
  const defs: AutomationDef[] = activeAutomations.map((a) => toAutomationDef(a, { storyReplyAvailable }));

  const { lastFiredAt, executionCount } = await loadFireState(
    activeAutomations.map((a) => a.id),
    contact.id,
  );

  const ctx: EvaluationContext = {
    now: new Date(),
    businessHours:
      (account.client.businessHours as unknown as EvaluationContext['businessHours']) ?? undefined,
    lastFiredAt,
    executionCount,
  };

  const result = evaluate(event, defs, ctx);

  // No winner → hand off to a human (fallback default for DMs).
  if (!result.winner) {
    await markNeedsHuman(conversation.id, 'NO_RULE_MATCHED');
    await recordExecution(null, conversation.id, contact.id, 'SKIPPED', result);
    await markProcessed(webhookEvent.id, 'no rule matched → human');
    return;
  }

  const winnerRow = account.automations.find((a) => a.id === result.winner?.automationId)!;

  if (result.blocked) {
    await recordExecution(winnerRow.id, conversation.id, contact.id, 'BLOCKED', result);
    await markProcessed(webhookEvent.id, `blocked: ${result.blockedReason}`);
    return;
  }

  // Winner executes: record + apply actions + enqueue message sends.
  const execution = await recordExecution(winnerRow.id, conversation.id, contact.id, 'EXECUTED', result);
  await prisma.automation.update({
    where: { id: winnerRow.id },
    data: { executionCount: { increment: 1 }, lastExecutedAt: new Date() },
  });

  // Optional public comment reply.
  if (event.kind === 'COMMENT' && winnerRow.trigger?.publicReply && event.commentId) {
    await createOutbound({
      accountId: account.id,
      conversationId: conversation.id,
      contactId: contact.id,
      kind: 'publicCommentReply',
      executionId: execution.id,
      stepIndex: -1,
      payload: { commentId: event.commentId, text: winnerRow.trigger.publicReply },
    });
  }

  const orderedSteps = [...winnerRow.steps].sort((a, b) => a.order - b.order);
  let handoff = false;
  for (const step of orderedSteps) {
    await applyStep({
      step,
      account,
      conversation,
      contact,
      event,
      executionId: execution.id,
      onHandoff: () => {
        handoff = true;
      },
    });
  }

  if (winnerRow.trigger?.type === 'NO_RULE_MATCHED' || handoff) {
    await markNeedsHuman(conversation.id, 'SCENARIO_COMPLETED');
  }

  await markProcessed(webhookEvent.id, `executed ${winnerRow.name}`);
  log.info(`webhook-event processed: ${winnerRow.name} for contact ${contact.id}`);
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

async function loadFireState(
  automationIds: string[],
  contactId: string,
): Promise<{ lastFiredAt: Record<string, Date | null>; executionCount: Record<string, number> }> {
  const lastFiredAt: Record<string, Date | null> = {};
  const executionCount: Record<string, number> = {};
  if (automationIds.length === 0) return { lastFiredAt, executionCount };

  const execs = await prisma.automationExecution.findMany({
    where: { automationId: { in: automationIds }, contactId, status: 'EXECUTED' },
    orderBy: { createdAt: 'desc' },
  });
  for (const id of automationIds) {
    const forId = execs.filter((e) => e.automationId === id);
    lastFiredAt[id] = forId[0]?.createdAt ?? null;
    executionCount[id] = forId.length;
  }
  return { lastFiredAt, executionCount };
}

async function recordExecution(
  automationId: string | null,
  conversationId: string,
  contactId: string,
  status: 'EXECUTED' | 'BLOCKED' | 'SKIPPED' | 'FAILED',
  result: ReturnType<typeof evaluate>,
): Promise<{ id: string }> {
  // For SKIPPED-with-no-winner we still want a row for auditability, tied to the
  // first traced automation if any; otherwise skip creation.
  const targetId = automationId ?? result.traces[0]?.automationId;
  if (!targetId) return { id: '' };
  return prisma.automationExecution.create({
    data: {
      automationId: targetId,
      conversationId,
      contactId,
      status,
      matchedKeyword: result.matchedKeyword,
      reason: result.blockedReason ?? 'evaluated',
      trace: result.traces as unknown as object,
    },
    select: { id: true },
  });
}

interface CreateOutboundInput {
  accountId: string;
  conversationId: string;
  contactId: string;
  kind: 'sendText' | 'sendMedia' | 'privateReply' | 'publicCommentReply';
  executionId: string;
  stepIndex: number;
  payload: Record<string, unknown>;
}

async function createOutbound(input: CreateOutboundInput): Promise<void> {
  const idempotencyKey = outboundIdempotencyKey({
    automationExecutionId: input.executionId,
    conversationId: input.conversationId,
    stepIndex: input.stepIndex,
    kind: input.kind,
    contentHashSource: JSON.stringify(input.payload),
  });
  try {
    const job = await prisma.outboundJob.create({
      data: {
        instagramAccountId: input.accountId,
        conversationId: input.conversationId,
        contactId: input.contactId,
        idempotencyKey,
        kind: input.kind,
        payload: input.payload as object,
        correlationId: input.executionId,
      },
    });
    await enqueueOutbound(job.id, idempotencyKey);
  } catch (err) {
    // Duplicate idempotency key → already queued; ignore.
    if ((err as { code?: string }).code !== 'P2002') throw err;
  }
}

interface ApplyStepInput {
  step: { actionType: string; config: unknown };
  account: { id: string };
  conversation: { id: string };
  contact: { id: string };
  event: NormalizedInstagramEvent;
  executionId: string;
  onHandoff: () => void;
}

async function applyStep(input: ApplyStepInput): Promise<void> {
  const cfg = (input.step.config ?? {}) as Record<string, unknown>;
  const idx = 0;
  switch (input.step.actionType) {
    case 'SEND_TEXT':
      await createOutbound({
        accountId: input.account.id,
        conversationId: input.conversation.id,
        contactId: input.contact.id,
        kind: input.event.kind === 'COMMENT' ? 'privateReply' : 'sendText',
        executionId: input.executionId,
        stepIndex: idx,
        payload:
          input.event.kind === 'COMMENT'
            ? { commentId: input.event.commentId, text: cfg.text, recipientScopedId: input.event.senderScopedId }
            : { recipientScopedId: input.event.senderScopedId, text: cfg.text },
      });
      break;
    case 'SEND_IMAGE':
      await createOutbound({
        accountId: input.account.id,
        conversationId: input.conversation.id,
        contactId: input.contact.id,
        kind: 'sendMedia',
        executionId: input.executionId,
        stepIndex: idx,
        payload: { recipientScopedId: input.event.senderScopedId, mediaUrl: cfg.mediaUrl, caption: cfg.caption },
      });
      break;
    case 'ADD_TAG':
      if (typeof cfg.tagId === 'string') {
        await prisma.contactTag
          .create({ data: { contactId: input.contact.id, tagId: cfg.tagId } })
          .catch(() => undefined);
      }
      break;
    case 'UPDATE_LEAD_STATUS':
      if (typeof cfg.status === 'string') {
        await prisma.lead.upsert({
          where: { contactId: input.contact.id },
          update: { status: cfg.status as never },
          create: { contactId: input.contact.id, status: cfg.status as never },
        });
      }
      break;
    case 'NEEDS_HUMAN':
      input.onHandoff();
      break;
    case 'PAUSE_AUTOMATION':
      await prisma.conversation.update({
        where: { id: input.conversation.id },
        data: { automationPaused: true },
      });
      break;
    case 'END_AUTOMATION':
    case 'WAIT':
    default:
      break;
  }
}

async function markNeedsHuman(conversationId: string, reason: string): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { needsHuman: true, status: 'NEEDS_HUMAN', handoffReason: reason as never },
  });
}

async function markProcessed(webhookEventId: string, note: string): Promise<void> {
  await prisma.webhookEvent.update({
    where: { id: webhookEventId },
    data: { status: 'PROCESSED', processedAt: new Date(), errorDetail: note.slice(0, 500) },
  });
}
