'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  evaluate,
  normalizePersian,
  type NormalizedInstagramEvent,
  type EvaluationContext,
} from '@tavakoli/core';
import { prisma, type Prisma } from '@tavakoli/database';
import { audit } from '@/lib/audit';
import { assertClientAccess, requireAdmin, requireUser } from '@/lib/guards';
import { toAutomationDef } from '@/server/automation-map';

const KEYWORD_TRIGGERS = ['DM_KEYWORD', 'COMMENT_KEYWORD', 'STORY_REPLY_KEYWORD'] as const;

const createSchema = z.object({
  instagramAccountId: z.string().min(1, 'پیج را انتخاب کنید.'),
  name: z.string().min(2, 'نام اتوماسیون را وارد کنید.'),
  triggerType: z.enum([
    'DM_KEYWORD',
    'COMMENT_KEYWORD',
    'STORY_REPLY_KEYWORD',
    'OUTSIDE_BUSINESS_HOURS',
    'NO_RULE_MATCHED',
  ]),
  matchMode: z.enum(['EXACT', 'CONTAINS', 'STARTS_WITH', 'ANY_OF']).optional(),
  keywords: z.string().optional(),
  /** JSON array produced by the steps editor. */
  steps: z.string().min(1, 'حداقل یک گام پاسخ لازم است.'),
  /** COMMENT_KEYWORD only: limit to one post, and optionally reply publicly too. */
  mediaId: z.string().optional(),
  /** One variant per line; a random one is used for each comment. */
  publicReplies: z.string().optional(),
  priority: z.coerce.number().int().min(0).default(0),
  cooldownSeconds: z.coerce.number().int().min(0).default(0),
});

/** Splits the textarea into trimmed, non-empty reply variants. */
function parseLines(raw: string | undefined): string[] {
  return (raw ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Action types the worker actually implements; anything else is rejected. */
const stepSchema = z.object({
  actionType: z.enum(['SEND_TEXT', 'SEND_IMAGE', 'SEND_AUDIO', 'WAIT', 'NEEDS_HUMAN']),
  text: z.string().optional(),
  mediaUrl: z.string().optional(),
  caption: z.string().optional(),
  seconds: z.coerce.number().int().min(1).max(60).optional(),
});

/**
 * Turns the steps editor payload into Prisma step rows. Empty text steps are a
 * common slip in the UI, so they are rejected rather than silently sending "".
 */
type StepRow = {
  order: number;
  actionType: z.infer<typeof stepSchema>['actionType'];
  config: Prisma.InputJsonValue;
};

function parseSteps(raw: string): { steps: StepRow[] } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: 'گام‌های پاسخ نامعتبر است.' };
  }
  const result = z.array(stepSchema).min(1).safeParse(parsed);
  if (!result.success) return { error: 'گام‌های پاسخ نامعتبر است.' };

  const steps: StepRow[] = [];
  for (const [index, step] of result.data.entries()) {
    let config: Prisma.InputJsonValue = {};
    if (step.actionType === 'SEND_TEXT') {
      const text = (step.text ?? '').trim();
      if (!text) return { error: `متن گام ${index + 1} خالی است.` };
      config = { text };
    } else if (step.actionType === 'SEND_IMAGE' || step.actionType === 'SEND_AUDIO') {
      const mediaUrl = (step.mediaUrl ?? '').trim();
      if (!/^https?:\/\//.test(mediaUrl)) {
        return {
          error:
            step.actionType === 'SEND_AUDIO'
              ? `برای گام ${index + 1} هنوز فایل صوتی آپلود نشده است.`
              : `آدرس عکس گام ${index + 1} باید با http یا https شروع شود.`,
        };
      }
      config = { mediaUrl, caption: (step.caption ?? '').trim() || undefined };
    } else if (step.actionType === 'WAIT') {
      config = { seconds: step.seconds ?? 3 };
    }
    steps.push({ order: index, actionType: step.actionType, config });
  }
  return { steps };
}

export interface AutomationFormState {
  error?: string;
}

export async function createAutomationAction(
  _prev: AutomationFormState,
  formData: FormData,
): Promise<AutomationFormState> {
  const user = await requireAdmin();
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'اطلاعات نامعتبر است.' };
  const d = parsed.data;

  const account = await prisma.instagramAccount.findUnique({
    where: { id: d.instagramAccountId },
    select: { clientId: true },
  });
  if (!account) return { error: 'پیج یافت نشد.' };

  const isKeyword = (KEYWORD_TRIGGERS as readonly string[]).includes(d.triggerType);
  const keywords = isKeyword
    ? (d.keywords ?? '')
        .split(/[,،\n]/)
        .map((k) => k.trim())
        .filter(Boolean)
    : [];

  if (isKeyword && keywords.length === 0) {
    return { error: 'برای این نوع محرک، حداقل یک کلمه کلیدی لازم است.' };
  }

  const parsedSteps = parseSteps(d.steps);
  if ('error' in parsedSteps) return { error: parsedSteps.error };

  const automation = await prisma.automation.create({
    data: {
      clientId: account.clientId,
      instagramAccountId: d.instagramAccountId,
      name: d.name,
      status: 'DRAFT',
      priority: d.priority,
      cooldownSeconds: d.cooldownSeconds,
      trigger: {
        create: {
          type: d.triggerType,
          matchMode: isKeyword ? (d.matchMode ?? 'CONTAINS') : null,
          keywords,
          mediaId: d.triggerType === 'COMMENT_KEYWORD' ? d.mediaId?.trim() || null : null,
          publicReplies: d.triggerType === 'COMMENT_KEYWORD' ? parseLines(d.publicReplies) : [],
        },
      },
      steps: { create: parsedSteps.steps },
    },
  });

  await audit({
    actorId: user.id,
    action: 'AUTOMATION_CREATE',
    entityType: 'Automation',
    entityId: automation.id,
  });
  revalidatePath('/automations');
  redirect(`/automations/${automation.id}`);
}

const updateSchema = createSchema
  .omit({ instagramAccountId: true })
  .extend({ automationId: z.string().min(1) });

/**
 * Edits an existing automation in place: name, trigger, keywords and reply text.
 * The page it belongs to is deliberately NOT editable — moving an automation
 * between pages would silently change which audience it answers.
 */
export async function updateAutomationAction(
  _prev: AutomationFormState,
  formData: FormData,
): Promise<AutomationFormState> {
  const user = await requireAdmin();
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'اطلاعات نامعتبر است.' };
  const d = parsed.data;

  const existing = await prisma.automation.findUnique({
    where: { id: d.automationId },
    select: { id: true, clientId: true },
  });
  if (!existing) return { error: 'اتوماسیون یافت نشد.' };

  const isKeyword = (KEYWORD_TRIGGERS as readonly string[]).includes(d.triggerType);
  const keywords = isKeyword
    ? (d.keywords ?? '')
        .split(/[,،\n]/)
        .map((k) => k.trim())
        .filter(Boolean)
    : [];

  if (isKeyword && keywords.length === 0) {
    return { error: 'برای این نوع محرک، حداقل یک کلمه کلیدی لازم است.' };
  }

  const updateSteps = parseSteps(d.steps);
  if ('error' in updateSteps) return { error: updateSteps.error };

  // Steps are replaced wholesale: rewriting the list is simpler and safer than
  // diffing orders against what the editor sent.
  await prisma.$transaction([
    prisma.automation.update({
      where: { id: d.automationId },
      data: { name: d.name, priority: d.priority, cooldownSeconds: d.cooldownSeconds },
    }),
    prisma.automationTrigger.update({
      where: { automationId: d.automationId },
      data: {
        type: d.triggerType,
        matchMode: isKeyword ? (d.matchMode ?? 'CONTAINS') : null,
        keywords,
        mediaId: d.triggerType === 'COMMENT_KEYWORD' ? d.mediaId?.trim() || null : null,
        publicReply: null,
        publicReplies: d.triggerType === 'COMMENT_KEYWORD' ? parseLines(d.publicReplies) : [],
      },
    }),
    prisma.automationStep.deleteMany({ where: { automationId: d.automationId } }),
    prisma.automationStep.createMany({
      data: updateSteps.steps.map((step) => ({ ...step, automationId: d.automationId })),
    }),
  ]);

  await audit({
    actorId: user.id,
    action: 'AUTOMATION_UPDATE',
    entityType: 'Automation',
    entityId: d.automationId,
  });
  revalidatePath('/automations');
  redirect(`/automations/${d.automationId}`);
}

export async function setAutomationStatusAction(
  automationId: string,
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DRAFT',
): Promise<void> {
  const user = await requireAdmin();
  await prisma.automation.update({ where: { id: automationId }, data: { status } });
  await audit({
    actorId: user.id,
    action: status === 'ACTIVE' ? 'AUTOMATION_ACTIVATE' : 'AUTOMATION_DEACTIVATE',
    entityType: 'Automation',
    entityId: automationId,
    metadata: { status },
  });
  revalidatePath(`/automations/${automationId}`);
  revalidatePath('/automations');
}

export interface DryRunResult {
  normalizedInput: string;
  winnerName: string | null;
  matchedKeyword?: string;
  blocked: boolean;
  blockedReason?: string;
  traces: Array<{ name: string; matched: boolean; selected: boolean; reason: string }>;
  plannedActions: string[];
  error?: string;
}

/**
 * Dry-run tester: evaluate an example message against the account's automations
 * WITHOUT sending anything. Mirrors the worker's evaluation path exactly.
 */
export async function dryRunAction(input: {
  accountId: string;
  kind: 'DM' | 'COMMENT' | 'STORY_REPLY';
  text: string;
  mediaId?: string;
}): Promise<DryRunResult> {
  const user = await requireUser();

  const account = await prisma.instagramAccount.findUnique({
    where: { id: input.accountId },
    include: {
      client: true,
      capabilities: true,
      automations: { include: { trigger: true, steps: true } },
    },
  });
  if (!account) {
    return {
      normalizedInput: '',
      winnerName: null,
      blocked: false,
      traces: [],
      plannedActions: [],
      error: 'پیج یافت نشد.',
    };
  }
  await assertClientAccess(user, account.clientId);

  const storyReplyAvailable = account.capabilities.some(
    (c) => c.key === 'STORY_REPLY' && c.available,
  );
  const defs = account.automations.map((a) => toAutomationDef(a, { storyReplyAvailable }));

  const event: NormalizedInstagramEvent = {
    kind: input.kind,
    providerAccountId: account.providerAccountId,
    senderScopedId: 'dry-run-user',
    text: input.text,
    mediaId: input.mediaId,
  };

  const ctx: EvaluationContext = {
    now: new Date(),
    businessHours:
      (account.client.businessHours as unknown as EvaluationContext['businessHours']) ?? undefined,
    lastFiredAt: {},
    executionCount: {},
  };

  const result = evaluate(event, defs, ctx);
  const winner = result.winner
    ? account.automations.find((a) => a.id === result.winner?.automationId)
    : null;

  const plannedActions: string[] = [];
  if (winner && !result.blocked) {
    for (const step of [...winner.steps].sort((a, b) => a.order - b.order)) {
      const blockedByCapability =
        step.actionType === 'SEND_QUICK_REPLIES' &&
        !account.capabilities.some((c) => c.key === 'QUICK_REPLIES' && c.available);
      plannedActions.push(
        blockedByCapability ? `${step.actionType} (مسدود به دلیل محدودیت Meta)` : step.actionType,
      );
    }
  }

  return {
    normalizedInput: result.normalizedInput || normalizePersian(input.text),
    winnerName: winner?.name ?? null,
    matchedKeyword: result.matchedKeyword,
    blocked: result.blocked,
    blockedReason: result.blockedReason,
    traces: result.traces.map((t) => ({
      name: t.name,
      matched: t.matched,
      selected: t.selected,
      reason: t.blockedReason ?? t.reason,
    })),
    plannedActions,
  };
}

/**
 * Soft-deletes an automation. Execution history keeps referencing it, so the
 * row stays and is simply hidden everywhere the panel lists automations.
 */
export async function deleteAutomationAction(
  automationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAdmin();

  const automation = await prisma.automation.findFirst({
    where: { id: automationId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!automation) return { ok: false, error: 'اتوماسیون یافت نشد.' };

  await prisma.automation.update({
    where: { id: automationId },
    data: { status: 'ARCHIVED', deletedAt: new Date() },
  });

  await audit({
    actorId: user.id,
    action: 'AUTOMATION_DELETE',
    entityType: 'Automation',
    entityId: automationId,
    metadata: { name: automation.name },
  });

  revalidatePath('/automations');
  return { ok: true };
}
