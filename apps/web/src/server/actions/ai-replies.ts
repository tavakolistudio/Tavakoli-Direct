'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma, type Prisma } from '@tavakoli/database';
import { audit } from '@/lib/audit';
import { assertClientAccess, requireAdmin } from '@/lib/guards';
import { ensureAiSchema } from '@/server/ensure-ai-schema';

/**
 * Server actions for the standalone "پاسخ هوشمند" (AI auto-reply) section. Each
 * AI auto-reply is stored as a normal Automation flagged `aiManaged`, so it
 * reuses the whole evaluation + worker pipeline — but it is created and edited
 * through this simple form instead of the crowded automation builder.
 *
 * The trigger is always COMMENT_KEYWORD with matchAnyComment=true (answer every
 * comment); an optional mediaId narrows it to one post. The single step is an
 * AI_REPLY that drafts the DM reply from the given knowledge base.
 */

const formSchema = z.object({
  knowledge: z.string().trim().min(10, 'اطلاعات/دانش کافی (حداقل ۱۰ کاراکتر) وارد کنید.'),
  language: z.enum(['auto', 'fa', 'tr', 'en']).default('auto'),
  /** Where the reply goes: public reply under the comment, private DM, or both. */
  replyMode: z.enum(['public', 'dm', 'both']).default('public'),
  instructions: z.string().optional(),
  fallbackText: z.string().optional(),
  postScope: z.enum(['all', 'post']).default('all'),
  mediaId: z.string().optional(),
  enabled: z.string().optional(),
});

const createSchema = formSchema.extend({
  instagramAccountId: z.string().min(1, 'پیج را انتخاب کنید.'),
});

const updateSchema = formSchema.extend({
  automationId: z.string().min(1),
});

export interface AiReplyFormState {
  error?: string;
}

function stepConfig(d: z.infer<typeof formSchema>): Prisma.InputJsonValue {
  return {
    knowledge: d.knowledge,
    instructions: d.instructions?.trim() || undefined,
    fallbackText: d.fallbackText?.trim() || undefined,
    language: d.language,
    replyMode: d.replyMode,
  };
}

/** Resolve the optional post limit; a page-wide reply has no mediaId. */
function resolveMediaId(d: z.infer<typeof formSchema>): string | null {
  return d.postScope === 'post' ? d.mediaId?.trim() || null : null;
}

export async function createAiReplyAction(
  _prev: AiReplyFormState,
  formData: FormData,
): Promise<AiReplyFormState> {
  const user = await requireAdmin();
  await ensureAiSchema();
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'اطلاعات نامعتبر است.' };
  const d = parsed.data;

  if (d.postScope === 'post' && !resolveMediaId(d)) {
    return { error: 'برای محدود کردن به یک پست، شناسهٔ پست را وارد کنید.' };
  }

  const account = await prisma.instagramAccount.findUnique({
    where: { id: d.instagramAccountId },
    select: { clientId: true, username: true },
  });
  if (!account) return { error: 'پیج یافت نشد.' };
  await assertClientAccess(user, account.clientId);

  const automation = await prisma.automation.create({
    data: {
      clientId: account.clientId,
      instagramAccountId: d.instagramAccountId,
      name: `پاسخ هوشمند — @${account.username}`,
      status: d.enabled === 'on' ? 'ACTIVE' : 'DRAFT',
      aiManaged: true,
      trigger: {
        create: {
          type: 'COMMENT_KEYWORD',
          matchAnyComment: true,
          mediaId: resolveMediaId(d),
          keywords: [],
        },
      },
      steps: { create: [{ order: 0, actionType: 'AI_REPLY', config: stepConfig(d) }] },
    },
  });

  await audit({
    actorId: user.id,
    action: 'AUTOMATION_CREATE',
    entityType: 'Automation',
    entityId: automation.id,
    metadata: { aiManaged: true },
  });
  revalidatePath('/ai-replies');
  redirect('/ai-replies');
}

export async function updateAiReplyAction(
  _prev: AiReplyFormState,
  formData: FormData,
): Promise<AiReplyFormState> {
  const user = await requireAdmin();
  await ensureAiSchema();
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'اطلاعات نامعتبر است.' };
  const d = parsed.data;

  if (d.postScope === 'post' && !resolveMediaId(d)) {
    return { error: 'برای محدود کردن به یک پست، شناسهٔ پست را وارد کنید.' };
  }

  const existing = await prisma.automation.findFirst({
    where: { id: d.automationId, aiManaged: true, deletedAt: null },
    select: { id: true, clientId: true, trigger: { select: { id: true } } },
  });
  if (!existing) return { error: 'پاسخ هوشمند یافت نشد.' };
  await assertClientAccess(user, existing.clientId);

  await prisma.$transaction([
    prisma.automation.update({
      where: { id: existing.id },
      data: { status: d.enabled === 'on' ? 'ACTIVE' : 'PAUSED' },
    }),
    prisma.automationTrigger.update({
      where: { automationId: existing.id },
      data: { mediaId: resolveMediaId(d), matchAnyComment: true, keywords: [] },
    }),
    prisma.automationStep.deleteMany({ where: { automationId: existing.id } }),
    prisma.automationStep.create({
      data: { automationId: existing.id, order: 0, actionType: 'AI_REPLY', config: stepConfig(d) },
    }),
  ]);

  await audit({
    actorId: user.id,
    action: 'AUTOMATION_UPDATE',
    entityType: 'Automation',
    entityId: existing.id,
  });
  revalidatePath('/ai-replies');
  redirect('/ai-replies');
}

/** Enable/disable an AI auto-reply from the list. */
export async function setAiReplyEnabledAction(
  automationId: string,
  enabled: boolean,
): Promise<void> {
  const user = await requireAdmin();
  await ensureAiSchema();
  const existing = await prisma.automation.findFirst({
    where: { id: automationId, aiManaged: true, deletedAt: null },
    select: { id: true, clientId: true },
  });
  if (!existing) return;
  await assertClientAccess(user, existing.clientId);
  await prisma.automation.update({
    where: { id: existing.id },
    data: { status: enabled ? 'ACTIVE' : 'PAUSED' },
  });
  await audit({
    actorId: user.id,
    action: enabled ? 'AUTOMATION_ACTIVATE' : 'AUTOMATION_DEACTIVATE',
    entityType: 'Automation',
    entityId: existing.id,
  });
  revalidatePath('/ai-replies');
}

export async function deleteAiReplyAction(automationId: string): Promise<{ ok: boolean }> {
  const user = await requireAdmin();
  await ensureAiSchema();
  const existing = await prisma.automation.findFirst({
    where: { id: automationId, aiManaged: true, deletedAt: null },
    select: { id: true, clientId: true },
  });
  if (!existing) return { ok: false };
  await assertClientAccess(user, existing.clientId);
  await prisma.automation.update({
    where: { id: existing.id },
    data: { status: 'ARCHIVED', deletedAt: new Date() },
  });
  await audit({
    actorId: user.id,
    action: 'AUTOMATION_DELETE',
    entityType: 'Automation',
    entityId: existing.id,
  });
  revalidatePath('/ai-replies');
  return { ok: true };
}
