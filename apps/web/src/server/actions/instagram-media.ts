'use server';

import { decryptSecret, prisma } from '@tavakoli/database';
import { env } from '@tavakoli/config';
import { assertClientAccess, requireUser } from '@/lib/guards';

export interface AccountPost {
  id: string;
  label: string;
  permalink?: string;
  thumbnailUrl?: string;
}

export interface AccountPostsResult {
  posts: AccountPost[];
  error?: string;
}

function summarise(caption: string | undefined, mediaType: string | undefined): string {
  const kind = mediaType === 'VIDEO' ? 'ویدیو' : mediaType === 'CAROUSEL_ALBUM' ? 'آلبوم' : 'عکس';
  const text = (caption ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return `${kind} بدون کپشن`;
  return `${kind} — ${text.length > 60 ? `${text.slice(0, 60)}…` : text}`;
}

/**
 * Lists the connected account's recent posts so a comment automation can be
 * limited to one of them by picking from a list instead of pasting a raw id.
 */
export async function listAccountPostsAction(accountId: string): Promise<AccountPostsResult> {
  const user = await requireUser();

  const account = await prisma.instagramAccount.findFirst({
    where: { id: accountId, deletedAt: null },
    include: { credential: true },
  });
  if (!account) return { posts: [], error: 'پیج یافت نشد.' };
  await assertClientAccess(user, account.clientId);

  if (account.provider !== 'meta' || !account.credential) {
    return { posts: [], error: 'این پیج به‌صورت رسمی متصل نیست.' };
  }

  const token = decryptSecret({
    ciphertext: account.credential.encryptedToken,
    iv: account.credential.tokenIv,
    authTag: account.credential.tokenAuthTag,
  });

  const url = new URL(`https://graph.instagram.com/${env.META_GRAPH_API_VERSION}/me/media`);
  url.searchParams.set('fields', 'id,caption,media_type,permalink,thumbnail_url,media_url');
  url.searchParams.set('limit', '25');
  url.searchParams.set('access_token', token);

  try {
    const res = await fetch(url, { method: 'GET' });
    const json = (await res.json().catch(() => ({}))) as {
      data?: Array<{
        id?: string;
        caption?: string;
        media_type?: string;
        permalink?: string;
        thumbnail_url?: string;
        media_url?: string;
      }>;
      error?: { message?: string };
    };
    if (!res.ok || !json.data) {
      return { posts: [], error: json.error?.message ?? 'دریافت پست‌ها ناموفق بود.' };
    }
    return {
      posts: json.data
        .filter((m): m is { id: string } & typeof m => Boolean(m.id))
        .map((m) => ({
          id: m.id,
          label: summarise(m.caption, m.media_type),
          permalink: m.permalink,
          thumbnailUrl: m.thumbnail_url ?? m.media_url,
        })),
    };
  } catch (err) {
    return { posts: [], error: (err as Error).message };
  }
}
