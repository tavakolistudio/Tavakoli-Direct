'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Label, Textarea } from '@tavakoli/ui';
import { saveModerationAction, type ConnectState } from '@/server/actions/instagram';

function Submit(): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'در حال ذخیره…' : 'ذخیره'}
    </Button>
  );
}

export function ModerationForm({
  accountId,
  enabled,
  words,
}: {
  accountId: string;
  enabled: boolean;
  words: string[];
}): React.ReactElement {
  const [state, action] = useActionState<ConnectState, FormData>(saveModerationAction, {});

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="accountId" value={accountId} />

      <label className="flex items-center gap-2 text-sm text-neutral-800">
        <input
          type="checkbox"
          name="moderationEnabled"
          defaultChecked={enabled}
          className="h-4 w-4"
        />
        مخفی‌سازی خودکار کامنت‌های حاوی کلمات ممنوعه
      </label>

      <div>
        <Label htmlFor="bannedWords">کلمات ممنوعه (با کاما یا خط جدید جدا کنید)</Label>
        <Textarea
          id="bannedWords"
          name="bannedWords"
          rows={5}
          defaultValue={words.join('\n')}
          placeholder={'کلاهبردار\nاسپم\nلینک تبلیغاتی'}
        />
      </div>

      <p className="text-xs leading-6 text-neutral-500">
        هر کامنتی که یکی از این کلمات را داشته باشد، با ابزار رسمی متا مخفی می‌شود — نه حذف. کامنت
        برای نویسنده‌اش قابل دیدن می‌ماند ولی برای بقیه پنهان است، و هیچ پاسخ خودکاری هم نمی‌گیرد.
        تطبیق با نرمال‌سازی فارسی انجام می‌شود (ی/ي، ک/ك، اعداد و نیم‌فاصله).
      </p>

      {state.error ? <p className="text-xs text-red-700">{state.error}</p> : null}
      {state.ok ? <p className="text-xs text-green-700">ذخیره شد ✅</p> : null}

      <Submit />
    </form>
  );
}
