'use client';

import { useEffect, useState } from 'react';
import { Button, Input, Label, Select } from '@tavakoli/ui';
import { listAccountPostsAction, type AccountPost } from '@/server/actions/instagram-media';

/**
 * Picks which post a comment automation applies to.
 *
 * Posts are only fetched when the admin asks, because each call spends a
 * request against the account's Instagram rate limit. An empty selection means
 * "every post", which is the common case.
 */
export function PostPicker({
  accountId,
  initialMediaId,
}: {
  accountId: string;
  initialMediaId: string;
}): React.ReactElement {
  const [mediaId, setMediaId] = useState(initialMediaId);
  const [posts, setPosts] = useState<AccountPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Reset when the admin switches to a different page mid-form.
  useEffect(() => {
    setPosts([]);
    setLoaded(false);
    setError(null);
  }, [accountId]);

  async function load(): Promise<void> {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    const res = await listAccountPostsAction(accountId);
    if (res.error) setError(res.error);
    setPosts(res.posts);
    setLoaded(true);
    setLoading(false);
  }

  const selected = posts.find((p) => p.id === mediaId);

  return (
    <div className="space-y-2">
      <input type="hidden" name="mediaId" value={mediaId} />
      <Label htmlFor="post-picker">این قانون روی کدام پست کار کند؟</Label>

      {loaded && posts.length > 0 ? (
        <Select id="post-picker" value={mediaId} onChange={(e) => setMediaId(e.target.value)}>
          <option value="">همهٔ پست‌ها</option>
          {posts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Select>
      ) : (
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={load}>
            {loading ? 'در حال دریافت…' : 'نمایش پست‌های اخیر'}
          </Button>
          <span className="text-xs text-neutral-500">
            {mediaId ? 'یک پست انتخاب شده است.' : 'الان روی همهٔ پست‌ها کار می‌کند.'}
          </span>
        </div>
      )}

      {selected?.permalink ? (
        <a
          href={selected.permalink}
          target="_blank"
          rel="noreferrer"
          className="text-brand-dark inline-block text-xs underline"
        >
          دیدن پست انتخاب‌شده در اینستاگرام
        </a>
      ) : null}

      {mediaId ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => setMediaId('')}>
          برداشتن محدودیت پست
        </Button>
      ) : null}

      {error ? (
        <div className="space-y-2">
          <p className="text-xs text-red-700">{error}</p>
          <Label htmlFor="manual-media-id">شناسه پست را دستی وارد کنید (اختیاری)</Label>
          <Input
            id="manual-media-id"
            dir="ltr"
            value={mediaId}
            onChange={(e) => setMediaId(e.target.value.trim())}
            placeholder="مثلاً 17847025167617707"
          />
          <p className="text-xs text-neutral-500">
            دریافت خودکار لیست پست‌ها ممکن است تا تأیید App Review در دسترس نباشد. خالی بگذارید تا
            روی همهٔ پست‌ها کار کند.
          </p>
        </div>
      ) : null}
      {loaded && posts.length === 0 && !error ? (
        <p className="text-xs text-neutral-500">پستی پیدا نشد.</p>
      ) : null}
    </div>
  );
}
