/**
 * Webhook-event processor: the async automation pipeline. Given a stored webhook
 * event, it records the inbound message + conversation, evaluates automations
 * deterministically, applies non-message actions, and enqueues outbound sends.
 * No provider calls happen here — those run in the outbound processor.
 */
import {
  evaluate,
  normalizePersian,
  outboundIdempotencyKey,
  type AutomationDef,
  type EvaluationContext,
  type NormalizedInstagramEvent,
} from '@tavakoli/core';
import { decryptSecret, prisma, type Prisma } from '@tavakoli/database';
import { getAiReplyProvider, getProvider } from '@tavakoli/integrations';
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
      credential: true,
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

  // Moderation: hide comments containing banned words, and stop there — spam
  // should get neither an automated reply nor an operator handoff.
  if (
    event.kind === 'COMMENT' &&
    account.moderationEnabled &&
    account.bannedWords.length > 0 &&
    event.commentId
  ) {
    const normalized = normalizePersian(event.text ?? '');
    const hit = account.bannedWords.find((w) => w && normalized.includes(normalizePersian(w)));
    if (hit) {
      await createOutbound({
        accountId: account.id,
        conversationId: conversation.id,
        contactId: contact.id,
        kind: 'hideComment',
        executionId: null,
        stepIndex: 0,
        payload: { commentId: event.commentId },
      });
      await markProcessed(webhookEvent.id, `comment hidden (moderation: ${hit})`);
      return;
    }
  }

  // Respect per-account and per-conversation automation pausing.
  if (!account.automationEnabled || conversation.automationPaused) {
    await markProcessed(webhookEvent.id, 'automation disabled/paused');
    return;
  }

  // Resume: tapping the follow-gate button always arrives as a DM postback,
  // even when the gated automation is a COMMENT_KEYWORD one — and a DM can
  // never match a COMMENT_KEYWORD trigger through normal keyword evaluation
  // (triggerMatchesEventKind requires kind === 'COMMENT' for that type). So a
  // resume token bypasses matching entirely and re-enters the automation directly.
  const resume = event.kind === 'DM' ? parseResumeToken(event.text) : null;
  if (resume) {
    const targetRow = account.automations.find(
      (a) => a.id === resume.automationId && a.status === 'ACTIVE',
    );
    if (!targetRow) {
      await markProcessed(webhookEvent.id, 'resume: automation no longer active');
      return;
    }
    // Only follow-gated automations care about follow status; a plain scenario
    // continuation (requireFollow=false) must never be blocked by it — checking
    // unconditionally here would silently swallow every button tap from a
    // non-follower, on automations that never asked for a follow at all.
    const follows = targetRow.trigger?.requireFollow
      ? await checkFollows(account, event.senderScopedId)
      : true;
    if (follows === false) {
      // Tapped before actually following — resend the same prompt rather than
      // silently doing nothing, which is the exact bug this token replaces.
      const prompt = targetRow.trigger?.followPrompt?.trim() || DEFAULT_FOLLOW_PROMPT;
      await createOutbound({
        accountId: account.id,
        conversationId: conversation.id,
        contactId: contact.id,
        kind: 'sendText',
        executionId: null,
        stepIndex: 0,
        payload: {
          recipientScopedId: event.senderScopedId,
          text: prompt,
          buttons: [
            {
              title: followButtonTitle(targetRow.trigger),
              payload: resumeToken(targetRow.id, resume.fromOrder),
            },
          ],
        },
      });
      await markProcessed(webhookEvent.id, 'resume: still not following');
      return;
    }
    await executeAutomation({
      winnerRow: targetRow,
      account,
      conversation,
      contact,
      event,
      matchedKeyword: targetRow.trigger?.keywords[0],
      fromOrder: resume.fromOrder,
    });
    await markProcessed(
      webhookEvent.id,
      `executed ${targetRow.name} (resume from step ${resume.fromOrder})`,
    );
    return;
  }

  // Build evaluation inputs.
  const storyReplyAvailable = account.capabilities.some(
    (c) => c.key === 'STORY_REPLY' && c.available,
  );
  const activeAutomations = account.automations.filter(
    (a) => a.status === 'ACTIVE' || a.trigger?.type === 'NO_RULE_MATCHED',
  );
  const defs: AutomationDef[] = activeAutomations.map((a) =>
    toAutomationDef(a, { storyReplyAvailable }),
  );

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

  // Follow gate: when required, non-followers get the follow prompt instead of
  // the scenario. The prompt's button carries the trigger keyword as payload, so
  // tapping it after following re-enters this same automation and passes.
  if (winnerRow.trigger?.requireFollow && (event.kind === 'COMMENT' || event.kind === 'DM')) {
    const follows = await checkFollows(account, event.senderScopedId);
    // null = the check itself failed; fail open so a Meta hiccup never mutes replies.
    if (follows === false) {
      const gateExecution = await recordExecution(
        winnerRow.id,
        conversation.id,
        contact.id,
        'BLOCKED',
        result,
      );
      const prompt = winnerRow.trigger.followPrompt?.trim() || DEFAULT_FOLLOW_PROMPT;
      await createOutbound({
        accountId: account.id,
        conversationId: conversation.id,
        contactId: contact.id,
        kind: event.kind === 'COMMENT' ? 'privateReply' : 'sendText',
        executionId: gateExecution.id,
        stepIndex: 0,
        payload: {
          recipientScopedId: event.senderScopedId,
          ...(event.kind === 'COMMENT' ? { commentId: event.commentId } : {}),
          text: prompt,
          // Carries which automation to resume, NOT the trigger keyword — the tap
          // always arrives as a DM, so a keyword payload could never re-match a
          // COMMENT_KEYWORD trigger. See parseResumeToken.
          buttons: [
            { title: followButtonTitle(winnerRow.trigger), payload: resumeToken(winnerRow.id) },
          ],
        },
      });
      await markProcessed(webhookEvent.id, 'follow gate: prompt sent');
      return;
    }
  }

  // Winner executes: record + apply actions + enqueue message sends.
  await executeAutomation({
    winnerRow,
    account,
    conversation,
    contact,
    event,
    matchedKeyword: result.matchedKeyword,
  });

  await markProcessed(webhookEvent.id, `executed ${winnerRow.name}`);
  log.info(`webhook-event processed: ${winnerRow.name} for contact ${contact.id}`);
}

/**
 * Prefix marking a button payload as "resume this automation directly", i.e.
 * bypass keyword/trigger-kind matching entirely and re-enter execution. Used
 * both for the follow-gate (fromOrder 0 — nothing sent yet) and for continuing
 * a comment scenario past Meta's one-private-reply limit (fromOrder > 0 — the
 * opening message already went out; only the remaining steps run).
 */
const DEFAULT_FOLLOW_PROMPT =
  'برای دریافت پاسخ، ابتدا صفحهٔ ما را فالو داشته باشید و بعد روی دکمهٔ زیر بزنید. 🙏';
const DEFAULT_FOLLOW_BUTTON = 'فالو کردم ✅';

/** Button title for the follow gate; falls back to the Persian default. */
function followButtonTitle(trigger: { followButtonLabel?: string | null } | null): string {
  return trigger?.followButtonLabel?.trim() || DEFAULT_FOLLOW_BUTTON;
}

const RESUME_PREFIX = '__resume:';

function resumeToken(automationId: string, fromOrder = 0): string {
  return `${RESUME_PREFIX}${automationId}:${fromOrder}`;
}

function parseResumeToken(
  text: string | undefined,
): { automationId: string; fromOrder: number } | null {
  if (!text?.startsWith(RESUME_PREFIX)) return null;
  const [automationId, orderStr] = text.slice(RESUME_PREFIX.length).split(':');
  if (!automationId) return null;
  const fromOrder = Number(orderStr);
  return { automationId, fromOrder: Number.isFinite(fromOrder) ? fromOrder : 0 };
}

/**
 * A COMMENT-triggered automation can deliver only its first message step
 * (Meta's private-reply limit); everything after that must wait for the
 * recipient to respond. Finds where the deliverable prefix ends.
 */
function findCommentSplit(steps: Array<{ order: number; actionType: string }>): {
  cutoffOrder: number;
  deferredFromOrder: number | null;
} {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const firstMessage = sorted.find((s) => MESSAGE_ACTIONS.has(s.actionType));
  if (!firstMessage) return { cutoffOrder: Infinity, deferredFromOrder: null };
  const hasMoreAfter = sorted.some(
    (s) => s.order > firstMessage.order && MESSAGE_ACTIONS.has(s.actionType),
  );
  return {
    cutoffOrder: firstMessage.order,
    deferredFromOrder: hasMoreAfter ? firstMessage.order + 1 : null,
  };
}

type AutomationWithStepsAndTrigger = Prisma.AutomationGetPayload<{
  include: { trigger: true; steps: true };
}>;

interface ExecuteAutomationInput {
  winnerRow: AutomationWithStepsAndTrigger;
  account: { id: string };
  conversation: { id: string };
  contact: { id: string };
  event: NormalizedInstagramEvent;
  matchedKeyword?: string;
  /** Skip steps before this order — resuming a deferred comment scenario. */
  fromOrder?: number;
}

/**
 * Runs one automation's steps: records the execution, sends the optional public
 * comment reply, and applies each step in order. Shared by the normal
 * evaluate()-selected path and both resume flows (follow-gate and deferred
 * comment continuation) — resume calls have no EvaluationResult, so they pass
 * matchedKeyword directly instead.
 *
 * For a fresh COMMENT match, Meta allows delivering only ONE message (private
 * replies are one-shot and text-only). If the automation has more than one
 * message step, only the first runs now; a continuation button is injected
 * into it automatically, and the rest run later via the resume path — the
 * admin builds one automation, not two.
 */
async function executeAutomation(input: ExecuteAutomationInput): Promise<void> {
  const { winnerRow, account, conversation, contact, event, matchedKeyword, fromOrder = 0 } = input;
  const isFreshRun = fromOrder === 0;

  const execution = await recordExecution(winnerRow.id, conversation.id, contact.id, 'EXECUTED', {
    normalizedInput: event.text ?? '',
    winner: null,
    matchedKeyword,
    traces: [],
    blocked: false,
  } as ReturnType<typeof evaluate>);

  if (isFreshRun) {
    await prisma.automation.update({
      where: { id: winnerRow.id },
      data: { executionCount: { increment: 1 }, lastExecutedAt: new Date() },
    });

    // Optional public comment reply. When several variants are configured one is
    // picked at random, so a page answering many comments does not look robotic.
    const publicReplyText = pickPublicReply(winnerRow.trigger);
    if (event.kind === 'COMMENT' && publicReplyText && event.commentId) {
      await createOutbound({
        accountId: account.id,
        conversationId: conversation.id,
        contactId: contact.id,
        kind: 'publicCommentReply',
        executionId: execution.id,
        stepIndex: -1,
        payload: { commentId: event.commentId, text: publicReplyText },
      });
    }
  }

  let orderedSteps = [...winnerRow.steps]
    .sort((a, b) => a.order - b.order)
    .filter((s) => s.order >= fromOrder);

  let deferredFromOrder: number | null = null;
  let cutoffOrder = Infinity;
  if (isFreshRun && event.kind === 'COMMENT') {
    const split = findCommentSplit(winnerRow.steps);
    deferredFromOrder = split.deferredFromOrder;
    cutoffOrder = split.cutoffOrder;
    orderedSteps = orderedSteps.filter((s) => s.order <= cutoffOrder);
  }

  // Only the FIRST message of a comment scenario is a private reply addressed to
  // the comment; Meta allows just one of those. Later messages are addressed to
  // the user directly, which is how a multi-message comment flow can work.
  let commentReplyUsed = false;
  let handoff = false;
  for (const step of orderedSteps) {
    const isMessageStep = MESSAGE_ACTIONS.has(step.actionType);
    const asPrivateReply = event.kind === 'COMMENT' && isMessageStep && !commentReplyUsed;
    if (asPrivateReply) commentReplyUsed = true;

    await applyStep({
      step,
      account,
      conversation,
      contact,
      event,
      executionId: execution.id,
      asPrivateReply,
      // Only the cutoff step (the one being deferred FROM) gets the injected
      // continuation button; every other step is untouched.
      resumeToken:
        deferredFromOrder !== null && step.order === cutoffOrder
          ? resumeToken(winnerRow.id, deferredFromOrder)
          : undefined,
      onHandoff: () => {
        handoff = true;
      },
    });
  }

  // Steps remain (deferred) → the scenario is not over yet; wait for the tap.
  if (deferredFromOrder === null && (winnerRow.trigger?.type === 'NO_RULE_MATCHED' || handoff)) {
    await markNeedsHuman(conversation.id, 'SCENARIO_COMPLETED');
  }
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

/** Resolves whether the contact follows the page; null when the check failed. */
async function checkFollows(
  account: {
    providerAccountId: string;
    credential: { encryptedToken: string; tokenIv: string; tokenAuthTag: string } | null;
  },
  scopedUserId: string,
): Promise<boolean | null> {
  const provider = getProvider();
  const accessToken =
    provider.name === 'meta' && account.credential
      ? decryptSecret({
          ciphertext: account.credential.encryptedToken,
          iv: account.credential.tokenIv,
          authTag: account.credential.tokenAuthTag,
        })
      : undefined;
  return provider.contactFollowsBusiness({ scopedUserId, accessToken });
}

/** Step kinds that produce an outbound message to the contact. */
const MESSAGE_ACTIONS = new Set([
  'SEND_TEXT',
  'AI_REPLY',
  'SEND_QUICK_REPLIES',
  'SEND_IMAGE',
  'SEND_AUDIO',
  'SEND_VIDEO',
]);

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
  kind: 'sendText' | 'sendMedia' | 'privateReply' | 'publicCommentReply' | 'hideComment';
  /** Null for jobs not born from an automation (e.g. moderation hides). */
  executionId: string | null;
  stepIndex: number;
  payload: Record<string, unknown>;
}

async function createOutbound(input: CreateOutboundInput): Promise<void> {
  const idempotencyKey = outboundIdempotencyKey({
    automationExecutionId: input.executionId ?? undefined,
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
  step: { actionType: string; config: unknown; order: number };
  account: { id: string };
  conversation: { id: string };
  contact: { id: string };
  event: NormalizedInstagramEvent;
  executionId: string;
  /** True for the one message that answers the comment itself. */
  asPrivateReply: boolean;
  /** When set, overrides the payload of every button without its own url. */
  resumeToken?: string;
  onHandoff: () => void;
}

/** A configured button, as stored in a SEND_QUICK_REPLIES step's config. */
interface ConfiguredButton {
  title: string;
  url?: string;
  payload?: string;
}

function resolveButtons(
  buttons: unknown,
  resumeTokenValue: string | undefined,
): ConfiguredButton[] | undefined {
  if (!Array.isArray(buttons) || buttons.length === 0) return undefined;
  return (buttons as ConfiguredButton[]).map((b) =>
    // A url button always opens its link; only "continue" buttons (no url)
    // get wired to resume the deferred rest of the scenario.
    !b.url && resumeTokenValue ? { ...b, payload: resumeTokenValue } : b,
  );
}

async function applyStep(input: ApplyStepInput): Promise<void> {
  const cfg = (input.step.config ?? {}) as Record<string, unknown>;
  // Must be the real step position: the outbound idempotency key includes it, so
  // a fixed value would make two same-kind steps collide and silently drop one.
  const idx = input.step.order;
  switch (input.step.actionType) {
    case 'SEND_TEXT':
    case 'SEND_QUICK_REPLIES': {
      const buttons = resolveButtons(cfg.buttons, input.resumeToken);
      await createOutbound({
        accountId: input.account.id,
        conversationId: input.conversation.id,
        contactId: input.contact.id,
        kind: input.asPrivateReply ? 'privateReply' : 'sendText',
        executionId: input.executionId,
        stepIndex: idx,
        payload: input.asPrivateReply
          ? {
              commentId: input.event.commentId,
              text: cfg.text,
              buttons,
              recipientScopedId: input.event.senderScopedId,
            }
          : {
              recipientScopedId: input.event.senderScopedId,
              text: cfg.text,
              buttons,
            },
      });
      break;
    }
    case 'AI_REPLY': {
      // Draft the reply from the step's knowledge base, then send it the same way
      // a static reply would go out (private DM reply for the comment itself).
      const ai = getAiReplyProvider();
      const generated = await ai.generateReply({
        knowledge: typeof cfg.knowledge === 'string' ? cfg.knowledge : '',
        instructions: typeof cfg.instructions === 'string' ? cfg.instructions : undefined,
        commentText: input.event.text ?? '',
        contactUsername: input.event.senderUsername,
        language:
          cfg.language === 'fa' || cfg.language === 'tr' || cfg.language === 'en'
            ? cfg.language
            : 'auto',
      });
      const text = generated.success
        ? generated.text
        : typeof cfg.fallbackText === 'string' && cfg.fallbackText.trim()
          ? cfg.fallbackText
          : undefined;
      if (!text) {
        // No draft and no fallback → hand off to a human rather than stay silent.
        input.onHandoff();
        break;
      }
      // Reply channel is operator-selectable: a public reply under the comment,
      // a private DM, or both. Anything but 'dm'/'both' defaults to 'public'.
      const replyMode =
        cfg.replyMode === 'dm' || cfg.replyMode === 'both' ? cfg.replyMode : 'public';
      const isComment = input.event.kind === 'COMMENT' && Boolean(input.event.commentId);

      // Public reply posted under the comment itself.
      if (isComment && (replyMode === 'public' || replyMode === 'both')) {
        await createOutbound({
          accountId: input.account.id,
          conversationId: input.conversation.id,
          contactId: input.contact.id,
          kind: 'publicCommentReply',
          executionId: input.executionId,
          stepIndex: idx,
          payload: { commentId: input.event.commentId, text },
        });
      }

      // Private DM reply (also the only option for non-comment events).
      if (replyMode === 'dm' || replyMode === 'both' || !isComment) {
        await createOutbound({
          accountId: input.account.id,
          conversationId: input.conversation.id,
          contactId: input.contact.id,
          kind: input.asPrivateReply ? 'privateReply' : 'sendText',
          executionId: input.executionId,
          stepIndex: idx,
          payload: input.asPrivateReply
            ? {
                commentId: input.event.commentId,
                text,
                recipientScopedId: input.event.senderScopedId,
              }
            : { recipientScopedId: input.event.senderScopedId, text },
        });
      }
      break;
    }
    case 'SEND_IMAGE':
    case 'SEND_AUDIO':
    case 'SEND_VIDEO':
      await createOutbound({
        accountId: input.account.id,
        conversationId: input.conversation.id,
        contactId: input.contact.id,
        kind: 'sendMedia',
        executionId: input.executionId,
        stepIndex: idx,
        payload: {
          recipientScopedId: input.event.senderScopedId,
          mediaUrl: cfg.mediaUrl,
          caption: cfg.caption,
          mediaType:
            input.step.actionType === 'SEND_AUDIO'
              ? 'audio'
              : input.step.actionType === 'SEND_VIDEO'
                ? 'video'
                : 'image',
        },
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

/**
 * Chooses the public comment reply to send: a random variant when several are
 * configured, otherwise the legacy single field. Returns null when neither is set.
 */
function pickPublicReply(
  trigger: { publicReplies?: string[] | null; publicReply?: string | null } | null | undefined,
): string | null {
  const variants = (trigger?.publicReplies ?? []).map((v) => v.trim()).filter(Boolean);
  if (variants.length > 0) {
    return variants[Math.floor(Math.random() * variants.length)] ?? null;
  }
  return trigger?.publicReply?.trim() || null;
}
