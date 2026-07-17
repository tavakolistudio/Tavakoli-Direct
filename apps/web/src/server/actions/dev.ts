'use server';

import { randomUUID } from 'node:crypto';
import { isProduction } from '@tavakoli/config';
import type { NormalizedInstagramEvent } from '@tavakoli/core';
import { prisma } from '@tavakoli/database';
import { requireAdmin } from '@/lib/guards';
import { ingestEvents } from '@/server/webhook-ingest';

export type MockEventType =
  | 'DM'
  | 'COMMENT'
  | 'STORY_REPLY'
  | 'DELIVERY_SUCCESS'
  | 'DELIVERY_FAILURE'
  | 'TOKEN_EXPIRED'
  | 'RETRY'
  | 'DUPLICATE'
  | 'RATE_LIMIT';

export interface MockResult {
  ok: boolean;
  message: string;
}

/**
 * Generate a mock event that flows through the SAME normalization → idempotency
 * → queue pipeline as a real webhook. Development-only; never in production.
 */
export async function generateMockEventAction(
  type: MockEventType,
  text = 'سلام، قیمت خدمات چقدره؟',
): Promise<MockResult> {
  if (isProduction()) return { ok: false, message: 'در محیط تولید غیرفعال است.' };
  await requireAdmin();

  const account = await prisma.instagramAccount.findFirst({
    where: { provider: 'mock', deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  if (!account) return { ok: false, message: 'ابتدا یک پیج آزمایشی متصل کنید.' };

  const base = { providerAccountId: account.providerAccountId, senderScopedId: `mock-user-${randomUUID().slice(0, 8)}` };

  const event = ((): NormalizedInstagramEvent => {
    switch (type) {
      case 'COMMENT':
        return { kind: 'COMMENT', ...base, text, mediaId: 'mock-media-1', commentId: `c-${randomUUID().slice(0, 8)}` };
      case 'STORY_REPLY':
        return { kind: 'STORY_REPLY', ...base, text };
      case 'DELIVERY_SUCCESS':
        return { kind: 'DELIVERY', ...base, providerMessageId: `mock-msg-${randomUUID().slice(0, 8)}` };
      case 'DELIVERY_FAILURE':
        return { kind: 'DM', ...base, senderScopedId: `${base.senderScopedId}::fail-temporary`, text };
      case 'TOKEN_EXPIRED':
        return { kind: 'TOKEN_EXPIRED', ...base };
      case 'RATE_LIMIT':
        return { kind: 'DM', ...base, senderScopedId: `${base.senderScopedId}::fail-rate-limit`, text };
      case 'DM':
      case 'RETRY':
      case 'DUPLICATE':
      default:
        return { kind: 'DM', ...base, text };
    }
  })();

  try {
    if (type === 'DUPLICATE') {
      const fixed = { ...event, providerMessageId: `dup-${randomUUID().slice(0, 8)}` };
      await ingestEvents([fixed], true);
      const second = await ingestEvents([fixed], true);
      return {
        ok: true,
        message: `رویداد تکراری ارسال شد. تعداد duplicate تشخیص‌داده‌شده: ${second.duplicates}`,
      };
    }

    const res = await ingestEvents([event], true);
    return {
      ok: true,
      message: `رویداد ${type} پردازش شد — در صف: ${res.queued}، تکراری: ${res.duplicates}`,
    };
  } catch (err) {
    return { ok: false, message: `خطا: ${(err as Error).message}. آیا Redis و worker در حال اجرا هستند؟` };
  }
}
