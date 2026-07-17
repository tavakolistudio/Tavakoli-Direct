'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Input, Label, Select } from '@tavakoli/ui';
import { connectMockAccountAction, type ConnectState } from '@/server/actions/instagram';

function Submit(): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'در حال اتصال…' : 'اتصال پیج آزمایشی'}
    </Button>
  );
}

export function ConnectMockForm({
  clients,
}: {
  clients: Array<{ id: string; name: string }>;
}): React.ReactElement {
  const [state, action] = useActionState<ConnectState, FormData>(connectMockAccountAction, {});

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Label htmlFor="clientId">مجموعه</Label>
        <Select id="clientId" name="clientId" required>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex-1">
        <Label htmlFor="username">نام کاربری پیج</Label>
        <Input id="username" name="username" dir="ltr" placeholder="tavakoli.studio" required />
      </div>
      <Submit />
      {state.ok ? <span className="text-sm text-green-700">پیج متصل شد.</span> : null}
      {state.error ? <span className="text-sm text-red-700">{state.error}</span> : null}
    </form>
  );
}
