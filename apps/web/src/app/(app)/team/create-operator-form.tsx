'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Input, Label, Select } from '@tavakoli/ui';
import { createOperatorAction, type TeamFormState } from '@/server/actions/team';

function Submit(): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'در حال ایجاد…' : 'ایجاد کاربر'}
    </Button>
  );
}

export function CreateOperatorForm(): React.ReactElement {
  const [state, action] = useActionState<TeamFormState, FormData>(createOperatorAction, {});

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label htmlFor="name">نام</Label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <Label htmlFor="email">ایمیل</Label>
        <Input id="email" name="email" type="email" dir="ltr" required />
      </div>
      <div>
        <Label htmlFor="password">رمز عبور اولیه</Label>
        <Input id="password" name="password" type="text" dir="ltr" required />
      </div>
      <div>
        <Label htmlFor="role">نقش</Label>
        <Select id="role" name="role" defaultValue="OPERATOR">
          <option value="OPERATOR">اپراتور</option>
          <option value="ADMIN">مدیر</option>
        </Select>
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Submit />
        {state.ok ? <span className="text-sm text-green-700">کاربر ایجاد شد.</span> : null}
        {state.error ? <span className="text-sm text-red-700">{state.error}</span> : null}
      </div>
    </form>
  );
}
