'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Input, Label, Select, Textarea } from '@tavakoli/ui';
import { createClientAction, type ClientFormState } from '@/server/actions/clients';

function Submit(): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'در حال ذخیره…' : 'ذخیره مجموعه'}
    </Button>
  );
}

export function ClientForm(): React.ReactElement {
  const [state, action] = useActionState<ClientFormState, FormData>(createClientAction, {});

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="name">نام مجموعه</Label>
        <Input id="name" name="name" required placeholder="مثلاً استودیو نمونه" />
      </div>
      <div>
        <Label htmlFor="description">توضیح کوتاه</Label>
        <Textarea id="description" name="description" placeholder="خدمات و معرفی کوتاه" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="phone">تلفن</Label>
          <Input id="phone" name="phone" dir="ltr" />
        </div>
        <div>
          <Label htmlFor="whatsapp">واتساپ</Label>
          <Input id="whatsapp" name="whatsapp" dir="ltr" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="website">وب‌سایت</Label>
          <Input id="website" name="website" dir="ltr" placeholder="https://" />
        </div>
        <div>
          <Label htmlFor="timeZone">منطقه زمانی</Label>
          <Select id="timeZone" name="timeZone" defaultValue="Asia/Tehran">
            <option value="Asia/Tehran">Asia/Tehran</option>
            <option value="Europe/Istanbul">Europe/Istanbul</option>
            <option value="UTC">UTC</option>
          </Select>
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Submit />
      </div>
    </form>
  );
}
