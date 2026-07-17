'use client';

import { useState, useTransition } from 'react';
import { Button, Input, Label } from '@tavakoli/ui';
import { generateMockEventAction, type MockEventType } from '@/server/actions/dev';

const EVENTS: Array<{ type: MockEventType; label: string }> = [
  { type: 'DM', label: 'دایرکت ورودی' },
  { type: 'COMMENT', label: 'کامنت ورودی' },
  { type: 'STORY_REPLY', label: 'پاسخ استوری' },
  { type: 'DELIVERY_SUCCESS', label: 'تحویل موفق' },
  { type: 'DELIVERY_FAILURE', label: 'تحویل ناموفق' },
  { type: 'TOKEN_EXPIRED', label: 'انقضای توکن' },
  { type: 'RETRY', label: 'تلاش مجدد وبهوک' },
  { type: 'DUPLICATE', label: 'وبهوک تکراری' },
  { type: 'RATE_LIMIT', label: 'خطای محدودیت نرخ' },
];

export function MockPanel(): React.ReactElement {
  const [text, setText] = useState('سلام، قیمت خدمات چقدره؟');
  const [log, setLog] = useState<string[]>([]);
  const [pending, start] = useTransition();

  function fire(type: MockEventType): void {
    start(async () => {
      const r = await generateMockEventAction(type, text);
      setLog((prev) => [`${r.ok ? '✓' : '✗'} ${r.message}`, ...prev].slice(0, 12));
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="mock-text">متن پیام نمونه</Label>
        <Input id="mock-text" value={text} onChange={(e) => setText(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {EVENTS.map((e) => (
          <Button
            key={e.type}
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => fire(e.type)}
          >
            {e.label}
          </Button>
        ))}
      </div>

      {log.length > 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
          <div className="mb-1 text-xs text-neutral-400">نتیجه‌ها</div>
          <ul className="space-y-1">
            {log.map((l, i) => (
              <li key={i} className="text-neutral-700">
                {l}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
