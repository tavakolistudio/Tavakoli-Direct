'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Input, Label, Select, Textarea, cn } from '@tavakoli/ui';
import { MATCH_MODE_LABELS, TRIGGER_LABELS } from '@/lib/labels';
import { createAutomationAction, type AutomationFormState } from '@/server/actions/automations';

const KEYWORD_TRIGGERS = ['DM_KEYWORD', 'COMMENT_KEYWORD', 'STORY_REPLY_KEYWORD'];

type TabKey = 'rule' | 'response';

function Submit(): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'در حال ساخت…' : 'ساخت و ذخیره'}
    </Button>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <fieldset className="rounded-lg border border-neutral-200 p-4">
      <legend className="text-brand-dark px-2 text-sm font-semibold">
        گام {n} — {title}
      </legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

export function AutomationWizard({
  accounts,
}: {
  accounts: Array<{ id: string; username: string; clientName: string }>;
}): React.ReactElement {
  const [state, action] = useActionState<AutomationFormState, FormData>(createAutomationAction, {});
  const [triggerType, setTriggerType] = useState('DM_KEYWORD');
  const [tab, setTab] = useState<TabKey>('rule');
  const isKeyword = KEYWORD_TRIGGERS.includes(triggerType);

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'rule', label: 'قانون و محرک' },
    { key: 'response', label: 'پاسخ هوشمند' },
  ];

  return (
    <form action={action} className="space-y-4">
      {/* Tab bar — separates the rule/trigger setup from the smart-response setup */}
      <div
        role="tablist"
        aria-label="بخش‌های ساخت اتوماسیون"
        className="flex gap-1 rounded-lg bg-neutral-100 p-1"
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              tab === t.key
                ? 'text-brand-dark bg-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Rule & trigger panel — kept mounted so its fields always submit */}
      <div className={cn('space-y-4', tab === 'rule' ? 'block' : 'hidden')}>
        <Step n={1} title="انتخاب پیج">
          <Label htmlFor="instagramAccountId">پیج اینستاگرام</Label>
          <Select id="instagramAccountId" name="instagramAccountId" required>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.clientName} — @{a.username}
              </option>
            ))}
          </Select>
          <Label htmlFor="name">نام اتوماسیون</Label>
          <Input id="name" name="name" placeholder="مثلاً پاسخ به کلمه قیمت" required />
        </Step>

        <Step n={2} title="انتخاب محرک">
          <Label htmlFor="triggerType">نوع محرک</Label>
          <Select
            id="triggerType"
            name="triggerType"
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value)}
          >
            {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          {triggerType === 'STORY_REPLY_KEYWORD' ? (
            <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
              این قابلیت با تنظیمات فعلی Meta ممکن است در دسترس نباشد و پشت پرچم قابلیت قرار دارد.
            </p>
          ) : null}
        </Step>

        {isKeyword ? (
          <Step n={3} title="تعریف شرط">
            <Label htmlFor="matchMode">نوع تطابق</Label>
            <Select id="matchMode" name="matchMode" defaultValue="CONTAINS">
              {Object.entries(MATCH_MODE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Label htmlFor="keywords">کلمات کلیدی (با کاما یا خط جدا کنید)</Label>
            <Textarea id="keywords" name="keywords" placeholder="قیمت، هزینه، تعرفه" />
          </Step>
        ) : null}

        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => setTab('response')}>
            بعدی: پاسخ هوشمند
          </Button>
        </div>
      </div>

      {/* Smart-response panel — kept mounted so its fields always submit */}
      <div className={cn('space-y-4', tab === 'response' ? 'block' : 'hidden')}>
        <Step n={4} title="تنظیم پاسخ هوشمند">
          <Label htmlFor="responseText">متن پاسخ</Label>
          <Textarea
            id="responseText"
            name="responseText"
            placeholder="سلام، برای دریافت تعرفه لطفاً نوع خدمت موردنظرتان را انتخاب کنید."
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="priority">اولویت</Label>
              <Input
                id="priority"
                name="priority"
                type="number"
                defaultValue={0}
                min={0}
                dir="ltr"
              />
            </div>
            <div>
              <Label htmlFor="cooldownSeconds">فاصله زمانی (ثانیه)</Label>
              <Input
                id="cooldownSeconds"
                name="cooldownSeconds"
                type="number"
                defaultValue={0}
                min={0}
                dir="ltr"
              />
            </div>
          </div>
        </Step>
      </div>

      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Submit />
        <span className="text-xs text-neutral-500">
          پس از ذخیره می‌توانید در گام آزمایش، اتوماسیون را بدون ارسال واقعی تست کنید.
        </span>
      </div>
    </form>
  );
}
