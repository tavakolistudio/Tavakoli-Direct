'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@tavakoli/ui';
import { deleteAiReplyAction, setAiReplyEnabledAction } from '@/server/actions/ai-replies';

export function AiReplyRowActions({
  automationId,
  enabled,
}: {
  automationId: string;
  enabled: boolean;
}): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle(): void {
    startTransition(async () => {
      await setAiReplyEnabledAction(automationId, !enabled);
      router.refresh();
    });
  }

  function remove(): void {
    if (!confirm('این پاسخ هوشمند حذف شود؟')) return;
    startTransition(async () => {
      await deleteAiReplyAction(automationId);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={toggle}>
        {enabled ? 'غیرفعال کردن' : 'فعال کردن'}
      </Button>
      <Link href={`/ai-replies/${automationId}/edit`}>
        <Button type="button" size="sm" variant="ghost">
          ویرایش
        </Button>
      </Link>
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={remove}>
        حذف
      </Button>
    </div>
  );
}
