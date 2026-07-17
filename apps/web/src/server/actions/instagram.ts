'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@tavakoli/database';
import { audit } from '@/lib/audit';
import { requireAdmin } from '@/lib/guards';

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
