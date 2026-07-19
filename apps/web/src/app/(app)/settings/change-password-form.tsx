'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Input, Label } from '@tavakoli/ui';
import { changePasswordAction, type ChangePasswordState } from '@/server/actions/auth';

function Submit(): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'در حال تغییر…' : 'تغییر رمز'}
    </Button>
  );
}

export function ChangePasswordForm(): React.ReactElement {
  const [state, action] = useActionState<ChangePasswordState, FormData>(changePasswordAction, {});

  return (
    <form action={action} className="max-w-sm space-y-3">
      <div>
        <Label htmlFor="currentPassword">رمز فعلی</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div>
        <Label htmlFor="newPassword">رمز جدید</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      <div>
        <Label htmlFor="confirmPassword">تکرار رمز جدید</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>

      <p className="text-xs leading-6 text-neutral-500">
        بعد از تغییر، همهٔ نشست‌های دیگر شما (مرورگرها و دستگاه‌های دیگر) بسته می‌شوند؛ همین نشست
        باز می‌ماند.
      </p>

      {state.error ? <p className="text-xs text-red-700">{state.error}</p> : null}
      {state.ok ? <p className="text-xs text-green-700">رمز با موفقیت تغییر کرد ✅</p> : null}

      <Submit />
    </form>
  );
}
