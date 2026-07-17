'use client';

import { useState, useTransition } from 'react';
import { Button, Input, Label, Select, Badge } from '@tavakoli/ui';
import { dryRunAction, type DryRunResult } from '@/server/actions/automations';

export function DryRunTester({ accountId }: { accountId: string }): React.ReactElement {
  const [text, setText] = useState('سلام، قیمت خدمات چقدره؟');
  const [kind, setKind] = useState<'DM' | 'COMMENT' | 'STORY_REPLY'>('DM');
  const [result, setResult] = useState<DryRunResult | null>(null);
  const [pending, startTransition] = useTransition();

  function run(): void {
    startTransition(async () => {
      const r = await dryRunAction({ accountId, kind, text });
      setResult(r);
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Label htmlFor="dry-text">پیام نمونه</Label>
          <Input id="dry-text" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="dry-kind">نوع رویداد</Label>
          <Select id="dry-kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="DM">دایرکت</option>
            <option value="COMMENT">کامنت</option>
            <option value="STORY_REPLY">پاسخ استوری</option>
          </Select>
        </div>
      </div>
      <Button size="sm" onClick={run} disabled={pending} type="button">
        {pending ? 'در حال آزمایش…' : 'آزمایش بدون ارسال واقعی'}
      </Button>

      {result ? (
        <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm">
          <div>
            <span className="text-neutral-500">ورودی نرمال‌شده: </span>
            <span dir="rtl" className="font-medium">{result.normalizedInput || '—'}</span>
          </div>
          <div>
            <span className="text-neutral-500">اتوماسیون منتخب: </span>
            {result.winnerName ? (
              <Badge tone={result.blocked ? 'warning' : 'success'}>{result.winnerName}</Badge>
            ) : (
              <Badge tone="neutral">هیچ‌کدام</Badge>
            )}
            {result.matchedKeyword ? (
              <span className="mr-2 text-neutral-500">(کلمه: {result.matchedKeyword})</span>
            ) : null}
          </div>
          {result.blocked ? (
            <p className="text-amber-700">مسدود: {result.blockedReason}</p>
          ) : null}
          {result.plannedActions.length > 0 ? (
            <div>
              <span className="text-neutral-500">اقدام‌هایی که اجرا می‌شوند: </span>
              {result.plannedActions.join('، ')}
            </div>
          ) : null}
          <div>
            <div className="mb-1 text-neutral-500">دلیل تطابق هر اتوماسیون:</div>
            <ul className="space-y-1">
              {result.traces.map((t, i) => (
                <li key={i} className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-1">
                  <span>{t.name}</span>
                  <span className="text-xs text-neutral-500">{t.reason}</span>
                </li>
              ))}
            </ul>
          </div>
          {result.error ? <p className="text-red-700">{result.error}</p> : null}
          <p className="text-xs text-neutral-400">در حالت آزمایش هیچ پیامی ارسال نمی‌شود.</p>
        </div>
      ) : null}
    </div>
  );
}
