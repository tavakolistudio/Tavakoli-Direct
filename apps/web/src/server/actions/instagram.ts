'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { decryptSecret, prisma } from '@tavakoli/database';
import { audit } from '@/lib/audit';
import { requireAdmin } from '@/lib/guards';
import { subscribeAccountToWebhooks } from '@/server/instagram-oauth';

const connectSchema = z.object({
  clientId: z.string().min(1),
  username: z.string().min(1, 'نام کاربری پیج را وارد کنید.'),
});

export interface ConnectState {
  error?: string;
  ok?: boolean;
}

/**
 * Connect a MOCK Instagram account. Real Meta connection uses the OAuth flow in
 * settings/integrations/meta (guarded until credentials exist).
 */
export async function connectMockAccountAction(
  _prev: ConnectState,
  formData: FormData,
): Promise<ConnectState> {
  const admin = await requireAdmin();
  const parsed = connectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'اطلاعات نامعتبر است.' };

  const { clientId, username } = parsed.data;
  const providerAccountId = `mock-${username}-${Date.now().toString(36)}`;

  const account = await prisma.instagramAccount.create({
    data: {
      clientId,
      providerAccountId,
      username,
      status: 'CONNECTED',
      tokenStatus: 'VALID',
      webhookStatus: 'VERIFIED',
      provider: 'mock',
      lastSyncedAt: new Date(),
      capabilities: {
        create: [
          { key: 'STORY_REPLY', available: false, detail: 'در حالت آزمایشی غیرفعال است' },
          { key: 'QUICK_REPLIES', available: true },
        ],
      },
    },
  });

  await audit({
    actorId: admin.id,
    action: 'INSTAGRAM_CONNECT',
    entityType: 'InstagramAccount',
    entityId: account.id,
    metadata: { provider: 'mock', username },
  });
  revalidatePath('/instagram-accounts');
  return { ok: true };
}

export async function toggleAccountAutomationAction(
  accountId: string,
  enabled: boolean,
): Promise<void> {
  const admin = await requireAdmin();
  await prisma.instagramAccount.update({
    where: { id: accountId },
    data: { automationEnabled: enabled },
  });
  await audit({
    actorId: admin.id,
    action: 'INSTAGRAM_TOGGLE_AUTOMATION',
    entityType: 'InstagramAccount',
    entityId: accountId,
    metadata: { enabled },
  });
  revalidatePath(`/instagram-accounts/${accountId}`);
}

export interface DeleteAccountResult {
  ok: boolean;
  error?: string;
}

/**
 * Disconnect and remove an Instagram account. Soft-deletes the account (so past
 * conversations, contacts and reports stay intact) and hard-deletes the stored
 * credential so the encrypted access token no longer exists.
 */
export async function deleteInstagramAccountAction(
  accountId: string,
): Promise<DeleteAccountResult> {
  const admin = await requireAdmin();

  const account = await prisma.instagramAccount.findUnique({
    where: { id: accountId },
    select: { id: true, username: true },
  });
  if (!account) return { ok: false, error: 'پیج یافت نشد.' };

  // Remove the token first — it must not survive a disconnect.
  await prisma.instagramCredential.deleteMany({ where: { accountId } });

  await prisma.instagramAccount.update({
    where: { id: accountId },
    data: {
      status: 'DISCONNECTED',
      tokenStatus: 'MISSING',
      automationEnabled: false,
      connectionError: null,
      deletedAt: new Date(),
    },
  });

  await audit({
    actorId: admin.id,
    action: 'INSTAGRAM_DISCONNECT',
    entityType: 'InstagramAccount',
    entityId: accountId,
    metadata: { username: account.username },
  });

  revalidatePath('/instagram-accounts');
  return { ok: true };
}

/**
 * Re-runs the webhook subscription for an already-connected account.
 *
 * Accounts connected before the subscription step existed have a valid token
 * but were never registered with Instagram, so no events are delivered. This
 * repairs them without forcing a reconnect.
 */
export async function resubscribeWebhooksAction(
  accountId: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();

  const account = await prisma.instagramAccount.findFirst({
    where: { id: accountId, deletedAt: null },
    include: { credential: true },
  });
  if (!account?.credential) return { ok: false, error: 'توکن این پیج موجود نیست.' };

  const token = decryptSecret({
    ciphertext: account.credential.encryptedToken,
    iv: account.credential.tokenIv,
    authTag: account.credential.tokenAuthTag,
  });

  const result = await subscribeAccountToWebhooks(token);

  await prisma.instagramAccount.update({
    where: { id: accountId },
    data: {
      webhookStatus: result.ok ? 'VERIFIED' : 'FAILED',
      connectionError: result.ok ? null : result.error,
    },
  });

  await audit({
    actorId: admin.id,
    action: 'INSTAGRAM_WEBHOOK_SUBSCRIBE',
    entityType: 'InstagramAccount',
    entityId: accountId,
    metadata: { ok: result.ok },
  });

  revalidatePath('/instagram-accounts');
  return result;
}

/**
 * Saves comment-moderation settings: a banned-word list that auto-hides
 * matching comments via Meta's official hide action.
 */
export async function saveModerationAction(
  _prev: ConnectState,
  formData: FormData,
): Promise<ConnectState> {
  const admin = await requireAdmin();
  const accountId = String(formData.get('accountId') ?? '');
  const enabled = formData.get('moderationEnabled') === 'on';
  const words = String(formData.get('bannedWords') ?? '')
    .split(/[,،\n]/)
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 200);

  const account = await prisma.instagramAccount.findFirst({
    where: { id: accountId, deletedAt: null },
    select: { id: true },
  });
  if (!account) return { error: 'پیج یافت نشد.' };

  if (enabled && words.length === 0) {
    return { error: 'برای فعال‌کردن، حداقل یک کلمه لازم است.' };
  }

  await prisma.instagramAccount.update({
    where: { id: accountId },
    data: { moderationEnabled: enabled, bannedWords: words },
  });

  await audit({
    actorId: admin.id,
    action: 'MODERATION_UPDATE',
    entityType: 'InstagramAccount',
    entityId: accountId,
    metadata: { enabled, wordCount: words.length },
  });

  revalidatePath(`/instagram-accounts/${accountId}`);
  return { ok: true };
}
