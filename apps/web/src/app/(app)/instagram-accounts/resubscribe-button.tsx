'use client';

import { useState, useTransition } from 'react';
import { Button } from '@tavakoli/ui';
import { resubscribeWebhooksAction } from '@/server/actions/instagram';

/**
 * Registers the account with Instagram's webhook delivery. Needed for pages
 * connected before the subscription step existed, and useful as a repair
 * button whenever events stop arriving.
 */
export function ResubscribeButton({ accountId }: { accountId: string }): React.ReactElement {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(): void {
    start(async () => {
      const res = await resubscribeWebhooksAction(accountId);
      setMessage(res.ok ? 'اشتراک وبهوک فعال شد ✅' : (res.error ?? 'ناموفق بود.'));
    });
  }

  return (
    <span className="flex items-center gap-2">
      <Button variant="ghost" size="sm" type="button" disabled={pending} onClick={run}>
        {pending ? '…' : 'فعال‌سازی وبهوک'}
      </Button>
      {message ? <span className="text-xs text-neutral-600">{message}</span> : null}
    </span>
  );
}
