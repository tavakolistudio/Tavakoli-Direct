'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Input, Label, Select, Textarea } from '@tavakoli/ui';
import type { AiReplyFormState } from '@/server/actions/ai-replies';

export interface AiReplyInitialValues {
  automationId?: string;
  knowledge?: string;
  language?: string;
  instructions?: string;
  fallbackText?: string;
  mediaId?: string | null;
  enabled?: boolean;
}

function Submit(): React.ReactElement {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'در حال ذخیره…' : 'ذخیره'}
    </Button>
  );
}

/**
 * Create/edit form for an AI auto-reply. All inputs are controlled so nothing is
 * lost when the server action returns a validation error — the exact complaint
 * about the old builder.
 */
export function AiReplyForm({
  action,
  accounts,
  initial,
}: {
  action: (state: AiReplyFormState, formData: FormData) => Promise<AiReplyFormState>;
  /** Only for create; edit hides the page selector. */
  accounts?: Array<{ id: string; username: string; clientName: string }>;
  initial?: AiReplyInitialValues;
}): React.ReactElement {
  const [state, formAction] = useActionState<AiReplyFormState, FormData>(action, {});
  const [knowledge, setKnowledge] = useState(initial?.knowledge ?? '');
  const [language, setLanguage] = useState(initial?.language ?? 'auto');
  const [instructions, setInstructions] = useState(initial?.instructions ?? '');
  const [fallbackText, setFallbackText] = useState(initial?.fallbackText ?? '');
  const [postScope, setPostScope] = useState<'all' | 'post'>(initial?.mediaId ? 'post' : 'all');
  const [mediaId, setMediaId] = useState(initial?.mediaId ?? '');
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);

  return (
    <form action={formAction} className="space-y-4">
      {initial?.automationId ? (
        <input type="hidden" name="automationId" value={initial.automationId} />
      ) : null}

      {accounts ? (
        <div className="space-y-1">
          <Label htmlFor="instagramAccountId">پیج اینستاگرام</Label>
          <Select id="instagramAccountId" name="instagramAccountId" required>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.clientName} — @{a.username}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      <div className="space-y-1">
        <Label htmlFor="knowledge">اطلاعات / دانشی که پاسخ‌ها بر اساس آن ساخته می‌شوند</Label>
        <Textarea
          id="knowledge"
          name="knowledge"
          rows={6}
          value={knowledge}
          onChange={(e) => setKnowledge(e.target.value)}
          placeholder={
            'مثلاً: تعرفه عکاسی پرتره از ۵۰۰ هزار تومان شروع می‌شود.\n' +
            'ساعت کاری: شنبه تا چهارشنبه ۱۰ تا ۱۸.\n' +
            'برای رزرو، شماره تماس بگذارید.'
          }
          required
        />
        <p className="text-xs text-neutral-500">
          هرچه دقیق‌تر بنویسید، پاسخ‌ها بهتر می‌شوند. هوش مصنوعی فقط بر اساس همین اطلاعات جواب می‌دهد.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="language">زبان پاسخ</Label>
        <Select
          id="language"
          name="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="auto">خودکار (هم‌زبان با کامنت کاربر)</option>
          <option value="fa">فارسی</option>
          <option value="tr">ترکی استانبولی</option>
          <option value="en">انگلیسی</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>پاسخ به کدام کامنت‌ها؟</Label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="postScope"
            value="all"
            checked={postScope === 'all'}
            onChange={() => setPostScope('all')}
          />
          همهٔ کامنت‌های این پیج
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="postScope"
            value="post"
            checked={postScope === 'post'}
            onChange={() => setPostScope('post')}
          />
          فقط یک پست خاص
        </label>
        {postScope === 'post' ? (
          <Input
            name="mediaId"
            dir="ltr"
            value={mediaId ?? ''}
            onChange={(e) => setMediaId(e.target.value)}
            placeholder="شناسهٔ پست (Media ID)"
          />
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="instructions">دستورالعمل لحن و سبک (اختیاری)</Label>
        <Textarea
          id="instructions"
          name="instructions"
          rows={2}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="مثلاً: مؤدب و صمیمی باش و همیشه از مشتری برای پیامش تشکر کن."
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="fallbackText">پاسخ جایگزین در صورت خطای هوش مصنوعی (اختیاری)</Label>
        <Textarea
          id="fallbackText"
          name="fallbackText"
          rows={2}
          value={fallbackText}
          onChange={(e) => setFallbackText(e.target.value)}
          placeholder="سلام، ممنون از پیام‌تان. همکاران ما به‌زودی پاسخ می‌دهند."
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        همین حالا فعال باشد
      </label>

      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <Submit />
    </form>
  );
}
