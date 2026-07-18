'use client';

import { useState, useTransition } from 'react';
import { Button } from '@tavakoli/ui';
import { deleteInstagramAccountAction } from '@/server/actions/instagram';

/**
 * Two-step delete: the first click asks for confirmation so a page is never
 * disconnected by accident. Removes the stored access token and hides the page.
 */
export function DeleteAccountButton({
  accountId,
  username,
}: {
  accountId: string;
  username: string;
}): React.ReactElement {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function remove(): void {
    start(async () => {
      const res = await deleteInstagramAccountAction(accountId);
      if (!res.ok) setError(res.error ?? 'حذف ناموفق بود.');
      setConfirming(false);
    });
  }

  if (error) {
    return <span className="text-xs text-red-700">{error}</span>;
  }

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" type="button" onClick={() => setConfirming(true)}>
        حذف
      </Button>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <span className="text-xs text-neutral-500">حذف @{username}؟</span>
      <Button variant="danger" size="sm" type="button" disabled={pending} onClick={remove}>
        {pending ? '…' : 'بله'}
      </Button>
      <Button variant="ghost" size="sm" type="button" onClick={() => setConfirming(false)}>
        انصراف
      </Button>
    </span>
  );
}
