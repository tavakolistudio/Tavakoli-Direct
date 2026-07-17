'use client';

import { useEffect } from 'react';
import { Button } from '@tavakoli/ui';

export default function Error({ reset }: { error: Error; reset: () => void }): React.ReactElement {
  useEffect(() => {
    // Intentionally do not surface raw error details to the user.
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold text-neutral-900">خطای نامشخصی رخ داد</h1>
      <p className="text-sm text-neutral-500">
        لطفاً دوباره تلاش کنید. اگر مشکل ادامه داشت با مدیر تماس بگیرید.
      </p>
      <Button onClick={reset}>تلاش دوباره</Button>
    </main>
  );
}
