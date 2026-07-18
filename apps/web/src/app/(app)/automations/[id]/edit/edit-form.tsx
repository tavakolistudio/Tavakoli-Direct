'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Input, Label, Select, Textarea } from '@tavakoli/ui';
import { MATCH_MODE_LABELS, TRIGGER_LABELS } from '@/lib/labels';
import { updateAutomationAction, type AutomationFormState } from '@/server/actions/automations';

const KEYWORD_TRIGGERS = ['DM_KEYWORD', 'COMMENT_KEYWORD', 'STORY_REPLY_KEYWORD'];

export interface AutomationEditValues {
  id: string;
  name: string;
  triggerType: string;
  matchMode: string;
  keywords: string;
  responseText: string;
  priority: number;
  cooldownSeconds: number;
  mediaId: string;
  publicReply: string;
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

        {isKeyword ? (
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
        ) : null}

        {isComment ? (
          <>
            <Label htmlFor="mediaId">شناسه پست (اختیاری)</Label>
            <Input id="mediaId" name="mediaId" defaultValue={values.mediaId} dir="ltr" />
            <p className="text-xs text-neutral-500">
              اگر خالی بماند، روی کامنت همهٔ پست‌ها کار می‌کند.
            </p>
            <Label htmlFor="publicReply">پاسخ عمومی زیر کامنت (اختیاری)</Label>
            <Input
              id="publicReply"
              name="publicReply"
              defaultValue={values.publicReply}
              placeholder="مثلاً: دایرکت رو چک کن 📩"
            />
          </>
        ) : null}
      </Section>

      <Section title="پاسخ">
        <Label htmlFor="responseText">متن پاسخ (دایرکت)</Label>
        <Textarea
          id="responseText"
          name="responseText"
          defaultValue={values.responseText}
          rows={5}
          required
        />
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
