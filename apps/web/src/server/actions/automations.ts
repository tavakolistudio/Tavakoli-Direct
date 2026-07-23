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
  /** COMMENT_KEYWORD only: answer ANY comment on that post (no keyword). */
  matchAnyComment: z.string().optional(),
  /** One variant per line; a random one is used for each comment. */
  publicReplies: z.string().optional(),
  /** Checkbox: only answer contacts who follow the page. */
  requireFollow: z.string().optional(),
  followPrompt: z.string().optional(),
  /** Localizable label for the "I followed" button. */
  followButtonLabel: z.string().optional(),
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

type TriggerType = z.infer<typeof createSchema>['triggerType'];

type TriggerData = {
  type: TriggerType;
  matchMode: 'EXACT' | 'CONTAINS' | 'STARTS_WITH' | 'ANY_OF' | null;
  keywords: string[];
  mediaId: string | null;
  matchAnyComment: boolean;
  publicReplies: string[];
  requireFollow: boolean;
  followPrompt: string | null;
  followButtonLabel: string | null;
};

/**
 * Validates and shapes the trigger fields shared by create and update. The
 * keyword requirement is waived for "any comment on this post" mode, which in
 * turn requires a post to be chosen — a page-wide any-comment rule would answer
 * every comment on every post.
 */
function deriveTrigger(
  d: Omit<z.infer<typeof createSchema>, 'instagramAccountId'>,
): { data: TriggerData } | { error: string } {
  const isKeyword = (KEYWORD_TRIGGERS as readonly string[]).includes(d.triggerType);
  const isComment = d.triggerType === 'COMMENT_KEYWORD';
  const matchAnyComment = isComment && d.matchAnyComment === 'on';
  const mediaId = isComment ? d.mediaId?.trim() || null : null;

  const keywords = isKeyword
    ? (d.keywords ?? '')
        .split(/[,،\n]/)
        .map((k) => k.trim())
        .filter(Boolean)
    : [];

  if (matchAnyComment && !mediaId) {
    return {
      error: 'برای «پاسخ به هر کامنت»، باید یک پست مشخص انتخاب کنید تا فقط زیر همان پست فعال شود.',
    };
  }
  if (isKeyword && keywords.length === 0 && !matchAnyComment) {
    return { error: 'برای این نوع محرک، حداقل یک کلمه کلیدی لازم است.' };
  }

  return {
    data: {
      type: d.triggerType,
      matchMode: isKeyword && !matchAnyComment ? (d.matchMode ?? 'CONTAINS') : null,
      keywords: matchAnyComment ? [] : keywords,
      mediaId,
      matchAnyComment,
      publicReplies: isComment ? parseLines(d.publicReplies) : [],
      requireFollow: d.requireFollow === 'on',
      followPrompt: d.followPrompt?.trim() || null,
      followButtonLabel: d.followButtonLabel?.trim().slice(0, 20) || null,
    },
  };
}

/** Action types the worker actually implements; anything else is rejected. */
const stepSchema = z.object({
  actionType: z.enum([
    'SEND_TEXT',
    'SEND_QUICK_REPLIES',
    'SEND_IMAGE',
    'SEND_AUDIO',
    'SEND_VIDEO',
    'WAIT',
    'NEEDS_HUMAN',
  ]),
  text: z.string().optional(),
  mediaUrl: z.string().optional(),
  caption: z.string().optional(),
  seconds: z.coerce.number().int().min(1).max(60).optional(),
  buttons: z.array(z.string()).optional(),
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

/** Instagram's per-message text limit; longer messages are rejected at send. */
const MAX_MESSAGE_LENGTH = 1000;

const MESSAGE_STEP_TYPES = new Set([
  'SEND_TEXT',
  'SEND_QUICK_REPLIES',
  'SEND_IMAGE',
  'SEND_AUDIO',
  'SEND_VIDEO',
]);

function parseSteps(
  raw: string,
  isCommentTrigger: boolean,
): { steps: StepRow[] } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: 'گام‌های پاسخ نامعتبر است.' };
  }
  const result = z.array(stepSchema).min(1).safeParse(parsed);
  if (!result.success) return { error: 'گام‌های پاسخ نامعتبر است.' };

  // Meta allows exactly ONE message to a first-time commenter, and it must be
  // text (private replies have no attachment support) — an image/audio/video as
  // the opener is silently rejected at send time ("outside of allowed window").
  // Extra message steps are allowed, but they can only be DELIVERED after the
  // recipient responds, so the worker defers them behind the first step's
  // button and sends them once the tap arrives (see findCommentSplit).
  if (isCommentTrigger) {
    const messageSteps = result.data.filter((s) => MESSAGE_STEP_TYPES.has(s.actionType));
    const first = messageSteps[0];
    if (first && first.actionType !== 'SEND_TEXT' && first.actionType !== 'SEND_QUICK_REPLIES') {
      return {
        error:
          'برای پاسخ به کامنت، اولین پیام باید «ارسال متن» یا «متن + دکمه» باشد — اینستاگرام عکس یا صدا را به‌عنوان اولین پیام به کسی که فقط کامنت گذاشته تحویل نمی‌دهد.',
      };
    }
    if (messageSteps.length > 1) {
      if (first!.actionType !== 'SEND_QUICK_REPLIES') {
        return {
          error:
            'چون گام‌های دیگری هم بعد از اولین پیام هست، گام اول باید «متن + دکمه» باشد — کاربر با زدن دکمه، بقیهٔ پیام‌ها (عکس/صدا/متن) را دریافت می‌کند.',
        };
      }
      const hasContinueButton = (first!.buttons ?? []).some((line) => !line.includes('|'));
      if (!hasContinueButton) {
        return {
          error:
            'برای رساندن پیام‌های بعدی، گام اول باید حداقل یک دکمهٔ ساده (بدون لینک) داشته باشد — همان دکمه‌ای که با زدنش بقیهٔ پیام‌ها ارسال می‌شود.',
        };
      }
    }
  }

  const steps: StepRow[] = [];
  for (const [index, step] of result.data.entries()) {
    let config: Prisma.InputJsonValue = {};
    if (step.actionType === 'SEND_TEXT' || step.actionType === 'SEND_QUICK_REPLIES') {
      const text = (step.text ?? '').trim();
      if (!text) return { error: `متن گام ${index + 1} خالی است.` };
      // Instagram rejects a message longer than ~1000 characters, so a too-long
      // reply silently never reaches the user. Block it at save time instead.
      if (text.length > MAX_MESSAGE_LENGTH) {
        return {
          error: `متن گام ${index + 1} خیلی طولانی است (${text.length} کاراکتر). اینستاگرام حداکثر ${MAX_MESSAGE_LENGTH} کاراکتر را در یک پیام ارسال می‌کند؛ متن را کوتاه‌تر کنید یا به چند گام تقسیم کنید.`,
        };
      }
      if (step.actionType === 'SEND_QUICK_REPLIES') {
        // Each line is "title" (posts that keyword back) or "title | url" (opens the link).
        const buttons: Array<{ title: string; url?: string }> = [];
        for (const line of step.buttons ?? []) {
          const [title, url] = line.split('|').map((part) => part.trim());
          if (!title) continue;
          if (url && !/^https?:\/\//.test(url)) {
            return { error: `لینک دکمهٔ «${title}» باید با http شروع شود.` };
          }
          buttons.push(url ? { title, url } : { title });
          if (buttons.length === 3) break;
        }
        if (buttons.length === 0) return { error: `گام ${index + 1} هیچ دکمه‌ای ندارد.` };
        config = { text, buttons };
      } else {
        config = { text };
      }
    } else if (
      step.actionType === 'SEND_IMAGE' ||
      step.actionType === 'SEND_AUDIO' ||
      step.actionType === 'SEND_VIDEO'
    ) {
      const mediaUrl = (step.mediaUrl ?? '').trim();
      if (!/^https?:\/\//.test(mediaUrl)) {
        return {
          error:
            step.actionType === 'SEND_IMAGE'
              ? `آدرس عکس گام ${index + 1} باید با http یا https شروع شود.`
              : `برای گام ${index + 1} هنوز فایلی آپلود نشده است.`,
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

  const trigger = deriveTrigger(d);
  if ('error' in trigger) return { error: trigger.error };

  const parsedSteps = parseSteps(d.steps, d.triggerType === 'COMMENT_KEYWORD');
  if ('error' in parsedSteps) return { error: parsedSteps.error };

  const automation = await prisma.automation.create({
    data: {
      clientId: account.clientId,
      instagramAccountId: d.instagramAccountId,
      name: d.name,
      status: 'DRAFT',
      priority: d.priority,
      cooldownSeconds: d.cooldownSeconds,
      trigger: { create: trigger.data },
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

  const trigger = deriveTrigger(d);
  if ('error' in trigger) return { error: trigger.error };

  const updateSteps = parseSteps(d.steps, d.triggerType === 'COMMENT_KEYWORD');
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
      data: { ...trigger.data, publicReply: null },
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
