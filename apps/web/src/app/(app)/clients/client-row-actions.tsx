'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, buttonVariants } from '@tavakoli/ui';
import { deleteClientAction } from '@/server/actions/clients';

interface ClientRowActionsProps {
  clientId: string;
  clientName: string;
}

export function ClientRowActions({
  clientId,
  clientName,
}: ClientRowActionsProps): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove(): void {
    const confirmed = window.confirm(
      `مجموعهٔ «${clientName}» حذف شود؟ دسترسی آن از پنل قطع و همهٔ پاسخ‌های خودکار آن متوقف می‌شوند.`,
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteClientAction(clientId);
        if (!result.ok) {
          setError(result.error ?? 'حذف مجموعه انجام نشد.');
          return;
        }
        router.refresh();
      } catch {
        setError('حذف مجموعه انجام نشد. دوباره تلاش کنید.');
      }
    });
  }

  return (
    <div className="flex min-w-max flex-col items-start gap-1">
      <div className="flex items-center gap-1">
        <Link
          href={`/clients/${clientId}/edit`}
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          تغییر نام
        </Link>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={remove}>
          {pending ? 'در حال حذف…' : 'حذف'}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="max-w-52 text-xs leading-5 text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
