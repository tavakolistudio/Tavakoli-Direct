'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Input, Label, Select, Textarea } from '@tavakoli/ui';
import { MATCH_MODE_LABELS, TRIGGER_HINTS, TRIGGER_LABELS } from '@/lib/labels';
import { createAutomationAction, type AutomationFormState } from '@/server/actions/automations';
import { StepsEditor } from '../steps-editor';
import { PostPicker } from '../post-picker';

const KEYWORD_TRIGGERS = ['DM_KEYWORD', 'COMMENT_KEYWORD', 'STORY_REPLY_KEYWORD'];

const PUBLIC_REPLY_PLACEHOLDER = [
  'براتون دایرکت شد ✅',
  'پیام دادیم بهتون 📩',
  'تو دایرکت جواب دادیم',
].join('\n');

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
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [matchAny, setMatchAny] = useState(false);
  const isKeyword = KEYWORD_TRIGGERS.includes(triggerType);
  const isComment = triggerType === 'COMMENT_KEYWORD';

  return (
    <form action={action} className="space-y-4">
      <Step n={1} title="انتخاب پیج">
        <Label htmlFor="instagramAccountId">پیج اینستاگرام</Label>
        <Select
          id="instagramAccountId"
          name="instagramAccountId"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          required
        >
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
        {TRIGGER_HINTS[triggerType] ? (
          <p className="text-xs text-neutral-500">{TRIGGER_HINTS[triggerType]}</p>
        ) : null}
        {triggerType === 'STORY_REPLY_KEYWORD' ? (
          <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
            این قابلیت با تنظیمات فعلی Meta ممکن است در دسترس نباشد و پشت پرچم قابلیت قرار دارد.
          </p>
        ) : null}
      </Step>

      {isKeyword ? (
        <Step n={3} title="تعریف شرط">
          {isComment ? (
            <>
              <label className="flex items-center gap-2 text-sm text-neutral-800">
                <input
                  type="checkbox"
                  name="matchAnyComment"
                  checked={matchAny}
                  onChange={(e) => setMatchAny(e.target.checked)}
                  className="h-4 w-4"
                />
                به هر کامنتی زیر پست انتخاب‌شده پاسخ داده شود (بدون کلمهٔ کلیدی)
              </label>
              <p className="text-xs text-neutral-500">
                برای این حالت، در گام بعد حتماً یک پست مشخص انتخاب کنید.
              </p>
            </>
          ) : null}
          {isComment && matchAny ? null : (
            <>
              <Label htmlFor="matchMode">نوع تطابق</Label>
              <Select id="matchMode" name="matchMode" defaultValue="CONTAINS">
                {Object.entries(MATCH_MODE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Label htmlFor="keywords">کلمات کلیدی (با کاما یا خط جدید جدا کنید)</Label>
              <Textarea id="keywords" name="keywords" placeholder="قیمت، هزینه، تعرفه" />
            </>
          )}
          <label className="flex items-center gap-2 text-sm text-neutral-800">
            <input type="checkbox" name="requireFollow" className="h-4 w-4" />
            فقط به دنبال‌کنندگان پیج پاسخ داده شود (فالو اجباری)
          </label>
          <Textarea
            name="followPrompt"
            rows={2}
            placeholder="پیام برای غیر دنبال‌کنندگان — خالی بگذارید تا متن پیش‌فرض ارسال شود."
          />
          <Label htmlFor="followButtonLabel">عنوان دکمهٔ تأیید فالو</Label>
          <Input
            id="followButtonLabel"
            name="followButtonLabel"
            placeholder="فالو کردم ✅"
            maxLength={20}
          />
          <p className="text-xs text-neutral-500">
            اگر کاربر پیج را دنبال نکرده باشد، این پیام با دکمهٔ بالا برایش می‌رود؛ بعد از فالو و
            زدن دکمه، پاسخ اصلی ارسال می‌شود. عنوان دکمه را می‌توانید به هر زبانی بنویسید.
          </p>
        </Step>
      ) : null}

      {triggerType === 'COMMENT_KEYWORD' ? (
        <Step n={4} title="پاسخ زیر کامنت (اختیاری)">
          <Label htmlFor="publicReplies">پاسخ‌های عمومی</Label>
          <Textarea
            id="publicReplies"
            name="publicReplies"
            rows={4}
            placeholder={PUBLIC_REPLY_PLACEHOLDER}
          />
          <p className="text-xs text-neutral-500">
            هر خط یک پاسخ. برای هر کامنت یکی به‌صورت تصادفی انتخاب می‌شود. خالی بگذارید تا زیر کامنت
            چیزی نوشته نشود.
          </p>
          <PostPicker accountId={accountId} initialMediaId="" />
        </Step>
      ) : null}

      <Step n={5} title="تنظیم پاسخ">
        <StepsEditor initial={[]} commentMode={triggerType === 'COMMENT_KEYWORD'} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="priority">اولویت</Label>
            <Input id="priority" name="priority" type="number" defaultValue={0} min={0} dir="ltr" />
            <p className="mt-1 text-xs text-neutral-500">
              فقط وقتی مهم است که چند اتوماسیون هم‌زمان بخوانند؛ عدد بزرگ‌تر برنده است.
            </p>
          </div>
          <div>
            <Label htmlFor="cooldownSeconds">فاصله زمانی (ثانیه)</Label>
            <Input
              id="cooldownSeconds"
              name="cooldownSeconds"
              type="number"
              defaultValue={86400}
              min={0}
              dir="ltr"
            />
            <p className="mt-1 text-xs text-neutral-500">
              هر شخص در این بازه فقط یک بار پاسخ می‌گیرد. ۸۶۴۰۰ یعنی ۲۴ ساعت.
            </p>
          </div>
        </div>
      </Step>

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
