'use client';

import { useTransition } from 'react';
import { Button } from '@tavakoli/ui';
import { setAutomationStatusAction } from '@/server/actions/automations';

export function StatusControls({
  automationId,
  status,
}: {
  automationId: string;
  status: string;
}): React.ReactElement {
  const [pending, start] = useTransition();

  function set(next: 'ACTIVE' | 'PAUSED' | 'ARCHIVED'): void {
    start(() => setAutomationStatusAction(automationId, next));
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== 'ACTIVE' ? (
        <Button size="sm" onClick={() => set('ACTIVE')} disabled={pending} type="button">
          فعال‌سازی
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => set('PAUSED')}
          disabled={pending}
          type="button"
        >
          توقف
        </Button>
      )}
      {status !== 'ARCHIVED' ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => set('ARCHIVED')}
          disabled={pending}
          type="button"
        >
          بایگانی
        </Button>
      ) : null}
    </div>
  );
}
