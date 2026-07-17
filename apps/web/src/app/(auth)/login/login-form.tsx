'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Input, Label } from '@tavakoli/ui';
import { loginAction, type LoginState } from '@/server/actions/auth';

function SubmitButton(): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? 'در حال ورود…' : 'ورود'}
    </Button>
  );
}

export function LoginForm(): React.ReactElement {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="email">ایمیل</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          dir="ltr"
          placeholder="admin@tavakoli.local"
          required
        />
      </div>

      <div>
        <Label htmlFor="password">رمز عبور</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            dir="ltr"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 hover:text-neutral-800"
            aria-label={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}
          >
            {showPassword ? 'پنهان' : 'نمایش'}
          </button>
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
