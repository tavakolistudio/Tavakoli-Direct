'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Input, Label, Textarea } from '@tavakoli/ui';
import { updateClientAction, type ClientFormState } from '@/server/actions/clients';

export interface ClientEditValues {
  id: string;
  name: string;
  description: string;
  phone: string;
  whatsapp: string;
  website: string;
  timeZone: string;
}

function Submit(): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
    </Button>
  );
}

export function EditClientForm({ values }: { values: ClientEditValues }): React.ReactElement {
  const [state, action] = useActionState<ClientFormState, FormData>(updateClientAction, {});

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="clientId" value={values.id} />

      <div>
        <Label htmlFor="name">نام مجموعه</Label>
        <Input id="name" name="name" defaultValue={values.name} required />
      </div>

      <div>
        <Label htmlFor="description">توضیح کوتاه</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={values.description} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="phone">تلفن</Label>
          <Input id="phone" name="phone" dir="ltr" defaultValue={values.phone} />
        </div>
        <div>
          <Label htmlFor="whatsapp">واتساپ</Label>
          <Input id="whatsapp" name="whatsapp" dir="ltr" defaultValue={values.whatsapp} />
        </div>
      </div>

      <div>
        <Label htmlFor="website">وب‌سایت</Label>
        <Input
          id="website"
          name="website"
          dir="ltr"
          defaultValue={values.website}
          placeholder="https://…"
        />
      </div>

      <input type="hidden" name="timeZone" value={values.timeZone} />

      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Submit />
        <Link href={`/clients/${values.id}`} className="text-sm text-neutral-500 hover:underline">
          انصراف
        </Link>
      </div>
    </form>
  );
}
