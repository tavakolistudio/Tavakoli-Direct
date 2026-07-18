'use client';

import { useState } from 'react';
import { Button, Label, Select } from '@tavakoli/ui';

/**
 * Real Instagram connection: sends the admin to the official Instagram business
 * login flow for the selected client. The token never touches the browser — the
 * callback stores it encrypted server-side.
 */
export function ConnectInstagram({
  clients,
  configured,
}: {
  clients: Array<{ id: string; name: string }>;
  configured: boolean;
}): React.ReactElement {
  const [clientId, setClientId] = useState(clients[0]?.id ?? '');

  if (!configured) {
    return (
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
        اعتبارنامه‌های اینستاگرام هنوز تنظیم نشده‌اند. برای فعال‌سازی، مقادیر{' '}
        <code dir="ltr">INSTAGRAM_APP_ID</code> و <code dir="ltr">INSTAGRAM_APP_SECRET</code> را در
        متغیرهای محیطی تنظیم کنید.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Label htmlFor="ig-client">این پیج برای کدام مجموعه است؟</Label>
        <Select id="ig-client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <Button
        type="button"
        disabled={!clientId}
        onClick={() => {
          window.location.href = `/api/integrations/instagram/start?clientId=${encodeURIComponent(clientId)}`;
        }}
      >
        اتصال با اینستاگرام
      </Button>
    </div>
  );
}
