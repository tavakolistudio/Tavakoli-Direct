'use client';

import { useState, useTransition } from 'react';
import { Button, Select, Textarea } from '@tavakoli/ui';
import { CONVERSATION_STATUS_LABELS } from '@/lib/labels';
import {
  addNoteAction,
  setConversationStatusAction,
  toggleAutomationPauseAction,
} from '@/server/actions/inbox';

type Status = 'OPEN' | 'NEEDS_HUMAN' | 'WAITING_CUSTOMER' | 'FOLLOW_UP' | 'RESOLVED';

export function ConversationPanel({
  conversationId,
  status,
  automationPaused,
}: {
  conversationId: string;
  status: Status;
  automationPaused: boolean;
}): React.ReactElement {
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submitNote(): void {
    if (!note.trim()) return;
    start(async () => {
      const r = await addNoteAction(conversationId, note);
      setMsg(r.ok ? 'یادداشت داخلی ثبت شد.' : (r.error ?? 'خطا'));
      if (r.ok) setNote('');
    });
  }

  function changeStatus(next: Status): void {
    start(async () => {
      const r = await setConversationStatusAction(conversationId, next);
      setMsg(r.ok ? 'وضعیت به‌روزرسانی شد.' : (r.error ?? 'خطا'));
    });
  }

  function togglePause(): void {
    start(async () => {
      const r = await toggleAutomationPauseAction(conversationId, !automationPaused);
      setMsg(r.ok ? 'انجام شد.' : (r.error ?? 'خطا'));
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 text-sm font-medium text-neutral-700">تغییر وضعیت گفتگو</div>
        <div className="flex gap-2">
          <Select
            value={status}
            onChange={(e) => changeStatus(e.target.value as Status)}
            disabled={pending}
          >
            {Object.entries(CONVERSATION_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={togglePause} disabled={pending} type="button">
          {automationPaused ? 'ازسرگیری اتوماسیون' : 'توقف اتوماسیون'}
        </Button>
        {status !== 'RESOLVED' ? (
          <Button size="sm" onClick={() => changeStatus('RESOLVED')} disabled={pending} type="button">
            بستن گفتگو
          </Button>
        ) : null}
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="mb-1.5 text-sm font-medium text-amber-800">
          یادداشت داخلی (برای کاربر اینستاگرام ارسال نمی‌شود)
        </div>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="یادداشت فقط برای تیم…"
          className="bg-white"
        />
        <Button size="sm" className="mt-2" onClick={submitNote} disabled={pending} type="button">
          ثبت یادداشت داخلی
        </Button>
      </div>

      {msg ? <p className="text-sm text-neutral-600">{msg}</p> : null}
    </div>
  );
}
