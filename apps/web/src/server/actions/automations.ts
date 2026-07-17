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
import { prisma } from '@tavakoli/database';
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
  responseText: z.string().min(1, 'متن پاسخ را وارد کنید.'),
  priority: z.coerce.number().int().min(0).default(0),
  cooldownSeconds: z.coerce.number().int().min(0).default(0),
});

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
        },
      },
      steps: { create: [{ order: 0, actionType: 'SEND_TEXT', config: { text: d.responseText } }] },
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
