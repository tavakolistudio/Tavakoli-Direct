'use client';

import { useState, useTransition } from 'react';
import { Button } from '@tavakoli/ui';
import { deleteAutomationAction } from '@/server/actions/automations';

/**
 * Two-step delete so a live automation is never removed by a stray click.
 * The row is archived rather than erased, keeping execution history intact.
 */
export function DeleteAutomationButton({
  automationId,
  name,
}: {
  automationId: string;
  name: string;
}): React.ReactElement {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function remove(): void {
    start(async () => {
      const res = await deleteAutomationAction(automationId);
      if (!res.ok) setError(res.error ?? 'حذف ناموفق بود.');
      setConfirming(false);
    });
  }

  if (error) return <span className="text-xs text-red-700">{error}</span>;

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" type="button" onClick={() => setConfirming(true)}>
        حذف
      </Button>
    );
  }

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
