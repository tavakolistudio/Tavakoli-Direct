'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { AppError, toAppError } from '@tavakoli/core';
import { prisma } from '@tavakoli/database';
import { audit } from '@/lib/audit';
import { assertClientAccess, requireUser } from '@/lib/guards';

async function loadConversation(id: string): Promise<{ clientId: string }> {
  const conv = await prisma.conversation.findUnique({ where: { id }, select: { clientId: true } });
  if (!conv) throw new AppError('VALIDATION', 'گفتگو یافت نشد.');
  return conv;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** Add an INTERNAL note (never sent to the Instagram user). */
export async function addNoteAction(conversationId: string, body: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const conv = await loadConversation(conversationId);
    await assertClientAccess(user, conv.clientId);

    const text = z.string().min(1).max(4000).parse(body.trim());
    await prisma.internalNote.create({
      data: { conversationId, authorId: user.id, body: text },
    });
    await audit({
      actorId: user.id,
      action: 'NOTE_ADD',
      entityType: 'Conversation',
      entityId: conversationId,
    });
    revalidatePath(`/inbox/${conversationId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toAppError(err).persianMessage };
  }
}

export async function setConversationStatusAction(
  conversationId: string,
  status: 'OPEN' | 'NEEDS_HUMAN' | 'WAITING_CUSTOMER' | 'FOLLOW_UP' | 'RESOLVED',
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const conv = await loadConversation(conversationId);
    await assertClientAccess(user, conv.clientId);

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status,
        needsHuman: status === 'NEEDS_HUMAN',
        ...(status === 'RESOLVED' ? { handoffReason: null } : {}),
      },
    });
    await audit({
      actorId: user.id,
      action: 'CONVERSATION_STATUS',
      entityType: 'Conversation',
      entityId: conversationId,
      metadata: { status },
    });
    revalidatePath(`/inbox/${conversationId}`);
    revalidatePath('/inbox');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toAppError(err).persianMessage };
  }
}

/** Pause or resume response automations for a single conversation. */
export async function toggleAutomationPauseAction(
  conversationId: string,
  paused: boolean,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const conv = await loadConversation(conversationId);
    await assertClientAccess(user, conv.clientId);

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        automationPaused: paused,
        ...(paused ? { handoffReason: 'OPERATOR_PAUSED' } : {}),
      },
    });
    await audit({
      actorId: user.id,
      action: paused ? 'AUTOMATION_PAUSE_CONV' : 'AUTOMATION_RESUME_CONV',
      entityType: 'Conversation',
      entityId: conversationId,
    });
    revalidatePath(`/inbox/${conversationId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toAppError(err).persianMessage };
  }
}

export async function assignToMeAction(conversationId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const conv = await loadConversation(conversationId);
    await assertClientAccess(user, conv.clientId);

    await prisma.conversationAssignment.create({
      data: { conversationId, userId: user.id },
    });
    revalidatePath(`/inbox/${conversationId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toAppError(err).persianMessage };
  }
}
