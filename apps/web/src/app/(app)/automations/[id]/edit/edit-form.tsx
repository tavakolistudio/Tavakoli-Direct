'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Input, Label, Select, Textarea } from '@tavakoli/ui';
import { MATCH_MODE_LABELS, TRIGGER_HINTS, TRIGGER_LABELS } from '@/lib/labels';
import { updateAutomationAction, type AutomationFormState } from '@/server/actions/automations';
import { StepsEditor, type StepDraft } from '../../steps-editor';
import { PostPicker } from '../../post-picker';

const KEYWORD_TRIGGERS = ['DM_KEYWORD', 'COMMENT_KEYWORD', 'STORY_REPLY_KEYWORD'];

export interface AutomationEditValues {
  id: string;
  name: string;
  triggerType: string;
  matchMode: string;
  keywords: string;
  steps: StepDraft[];
  priority: number;
  cooldownSeconds: number;
  accountId: string;
  requireFollow: boolean;
  followPrompt: string;
  mediaId: string;
  matchAnyComment: boolean;
  publicReplies: string;
}

function Submit(): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
    </Button>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <fieldset className="rounded-lg border border-neutral-200 p-4">
      <legend className="text-brand-dark px-2 text-sm font-semibold">{title}</legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

export function AutomationEditForm({
  values,
}: {
  values: AutomationEditValues;
}): React.ReactElement {
  const [state, action] = useActionState<AutomationFormState, FormData>(updateAutomationAction, {});
  const [triggerType, setTriggerType] = useState(values.triggerType);
  const [matchAny, setMatchAny] = useState(values.matchAnyComment);
  const isKeyword = KEYWORD_TRIGGERS.includes(triggerType);
  const isComment = triggerType === 'COMMENT_KEYWORD';

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="automationId" value={values.id} />

      <Section title="مشخصات">
        <Label htmlFor="name">نام اتوماسیون</Label>
        <Input id="name" name="name" defaultValue={values.name} required />
      </Section>

      <Section title="محرک">
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

        {isKeyword ? (
          <>
            {isComment && matchAny ? null : (
              <>
                <Label htmlFor="matchMode">نوع تطابق</Label>
                <Select id="matchMode" name="matchMode" defaultValue={values.matchMode}>
                  {Object.entries(MATCH_MODE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <Label htmlFor="keywords">کلمات کلیدی (با کاما یا خط جدید جدا کنید)</Label>
                <Textarea id="keywords" name="keywords" defaultValue={values.keywords} />
              </>
            )}
            <label className="flex items-center gap-2 text-sm text-neutral-800">
              <input
                type="checkbox"
                name="requireFollow"
                defaultChecked={values.requireFollow}
                className="h-4 w-4"
              />
              فقط به دنبال‌کنندگان پیج پاسخ داده شود (فالو اجباری)
            </label>
            <Textarea
              name="followPrompt"
              rows={2}
              defaultValue={values.followPrompt}
              placeholder="پیام برای غیر دنبال‌کنندگان — خالی بگذارید تا متن پیش‌فرض ارسال شود."
            />
            <p className="text-xs text-neutral-500">
              اگر کاربر پیج را دنبال نکرده باشد، به‌جای پاسخ اصلی این پیام با دکمهٔ «فالو کردم ✅»
              برایش می‌رود؛ بعد از فالو و زدن دکمه، پاسخ اصلی ارسال می‌شود.
            </p>
          </>
        ) : null}

        {isComment ? (
          <>
            <PostPicker accountId={values.accountId} initialMediaId={values.mediaId} />
            <label className="flex items-center gap-2 text-sm text-neutral-800">
              <input
                type="checkbox"
                name="matchAnyComment"
                checked={matchAny}
                onChange={(e) => setMatchAny(e.target.checked)}
                className="h-4 w-4"
              />
              به هر کامنتی زیر این پست پاسخ داده شود (بدون کلمهٔ کلیدی)
            </label>
            <p className="text-xs text-neutral-500">
              با این گزینه، هر کسی زیر پست انتخاب‌شده کامنت بگذارد پاسخ می‌گیرد. حتماً باید یک پست
              مشخص انتخاب شده باشد.
            </p>
            <Label htmlFor="publicReplies">پاسخ‌های عمومی زیر کامنت (اختیاری)</Label>
            <Textarea
              id="publicReplies"
              name="publicReplies"
              defaultValue={values.publicReplies}
              rows={4}
              placeholder={'براتون دایرکت شد ✅\nپیام دادیم بهتون 📩\nتو دایرکت جواب دادیم'}
            />
            <p className="text-xs text-neutral-500">
              هر خط یک پاسخ. برای هر کامنت یکی از آن‌ها به‌صورت تصادفی انتخاب می‌شود تا پاسخ‌ها
              تکراری و رباتیک به نظر نرسند. خالی بگذارید تا زیر کامنت چیزی نوشته نشود.
            </p>
          </>
        ) : null}
      </Section>

      <Section title="پاسخ">
        <StepsEditor initial={values.steps} commentMode={isComment} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="priority">اولویت</Label>
            <Input
              id="priority"
              name="priority"
              type="number"
              defaultValue={values.priority}
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
              defaultValue={values.cooldownSeconds}
              min={0}
              dir="ltr"
            />
          </div>
        </div>
      </Section>

      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Submit />
        <Link
          href={`/automations/${values.id}`}
          className="text-sm text-neutral-500 hover:underline"
        >
          انصراف
        </Link>
      </div>
    </form>
  );
}
