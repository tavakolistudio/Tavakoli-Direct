'use client';

import { useState, useTransition } from 'react';
import { Button } from '@tavakoli/ui';
import { deleteUserAction, toggleUserActiveAction } from '@/server/actions/team';

/**
 * Row controls for a team member. The current admin gets no controls at all —
 * locking or deleting yourself is never something you meant to do.
 */
export function MemberActions({
  userId,
  name,
  isActive,
  isSelf,
}: {
  userId: string;
  name: string;
  isActive: boolean;
  isSelf: boolean;
}): React.ReactElement {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (isSelf) {
    return <span className="text-xs text-neutral-400">حساب شما</span>;
  }

  function toggle(): void {
    start(async () => {
      await toggleUserActiveAction(userId, !isActive);
    });
  }

  function remove(): void {
    start(async () => {
      const res = await deleteUserAction(userId);
      if (!res.ok) setError(res.error ?? 'حذف ناموفق بود.');
      setConfirming(false);
    });
  }

  if (error) return <span className="text-xs text-red-700">{error}</span>;

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <span className="text-xs text-neutral-500">«{name}» حذف شود؟</span>
        <Button variant="danger" size="sm" type="button" disabled={pending} onClick={remove}>
          {pending ? '…' : 'بله'}
        </Button>
        <Button variant="ghost" size="sm" type="button" onClick={() => setConfirming(false)}>
          انصراف
        </Button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <Button variant="ghost" size="sm" type="button" disabled={pending} onClick={toggle}>
        {isActive ? 'غیرفعال کردن' : 'فعال کردن'}
      </Button>
      <Button variant="ghost" size="sm" type="button" onClick={() => setConfirming(true)}>
        حذف
      </Button>
    </span>
  );
}
