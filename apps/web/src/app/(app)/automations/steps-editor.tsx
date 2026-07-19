'use client';

import { useRef, useState } from 'react';
import { Button, Input, Label, Select, Textarea } from '@tavakoli/ui';

/**
 * Builder for an automation's response steps.
 *
 * Only action types the worker actually implements are offered — an option that
 * silently does nothing is worse than no option at all. The list is serialised
 * into a hidden field so the whole thing still submits as a plain form.
 */
export interface StepDraft {
  actionType: string;
  text?: string;
  mediaUrl?: string;
  caption?: string;
  seconds?: number;
  /** Quick-reply button titles, for SEND_QUICK_REPLIES. */
  buttons?: string[];
}

const STEP_LABELS: Record<string, string> = {
  SEND_TEXT: 'ارسال متن',
  SEND_IMAGE: 'ارسال عکس',
  SEND_AUDIO: 'ارسال صدا',
  SEND_VIDEO: 'ارسال فیلم',
  SEND_QUICK_REPLIES: 'متن + دکمه',
  WAIT: 'مکث',
  NEEDS_HUMAN: 'ارجاع به اپراتور',
};

const STEP_HINTS: Record<string, string> = {
  SEND_TEXT: 'برای کامنت، این پیام به‌صورت دایرکت برای کامنت‌گذار می‌رود.',
  SEND_IMAGE: 'فایل jpg یا png را آپلود کنید، یا آدرس مستقیم یک عکس عمومی را بگذارید.',
  SEND_AUDIO: 'فایل m4a یا mp3، حداکثر ۸ مگابایت. پس از آپلود برای مخاطب ارسال می‌شود.',
  SEND_VIDEO: 'فایل mp4، حداکثر ۲۵ مگابایت.',
  SEND_QUICK_REPLIES:
    'متن به‌همراه دکمه‌های قابل لمس. کاربر با زدن دکمه، همان متن را برایتان می‌فرستد — پس می‌توانید روی همان کلمه یک اتوماسیون دیگر بسازید.',
  WAIT: 'کمی صبر می‌کند تا پیام‌ها پشت سر هم و طبیعی‌تر برسند.',
  NEEDS_HUMAN: 'گفتگو به کارتابل اپراتور می‌رود تا انسان جواب دهد.',
};

const NEWLINE = '\n';
const BUTTONS_PLACEHOLDER = ['تعرفه‌ها', 'نمونه کارها', 'مشاوره رایگان'].join(NEWLINE);

function emptyStep(actionType: string): StepDraft {
  return actionType === 'WAIT' ? { actionType, seconds: 3 } : { actionType };
}

const MESSAGE_ACTIONS = [
  'SEND_TEXT',
  'SEND_QUICK_REPLIES',
  'SEND_IMAGE',
  'SEND_AUDIO',
  'SEND_VIDEO',
];

export function StepsEditor({
  initial,
  commentMode = false,
}: {
  initial: StepDraft[];
  /** Comment automations may only send one message; warn while building. */
  commentMode?: boolean;
}): React.ReactElement {
  const [steps, setSteps] = useState<StepDraft[]>(
    initial.length > 0 ? initial : [{ actionType: 'SEND_TEXT', text: '' }],
  );
  const [uploading, setUploading] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recordingIndex, setRecordingIndex] = useState<number | null>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Instagram only accepts m4a/mp3, so recording is offered solely where the
  // browser can produce mp4 audio (Chrome/Safari); elsewhere upload still works.
  const canRecord =
    typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/mp4');

  function stopRecording(): void {
    recorderRef.current?.stop();
  }

  async function startRecording(index: number): Promise<void> {
    setUploadError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/mp4' });
      recorderRef.current = recorder;
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setRecordingIndex(null);
        const file = new File(chunks, 'recording.m4a', { type: 'audio/mp4' });
        if (file.size > 0) void uploadFile(index, file);
      };
      recorder.start();
      setRecordingIndex(index);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((v) => v + 1), 1000);
    } catch {
      setUploadError('دسترسی به میکروفون داده نشد.');
    }
  }

  async function uploadFile(index: number, file: File): Promise<void> {
    setUploadError(null);
    setUploading(index);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/uploads/media', { method: 'POST', body });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setUploadError(json.error ?? 'آپلود ناموفق بود.');
        return;
      }
      update(index, { mediaUrl: json.url });
    } catch {
      setUploadError('آپلود ناموفق بود.');
    } finally {
      setUploading(null);
    }
  }

  function update(index: number, patch: Partial<StepDraft>): void {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function remove(index: number): void {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function move(index: number, delta: number): void {
    setSteps((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  const messageStepCount = steps.filter((s) => MESSAGE_ACTIONS.includes(s.actionType)).length;

  return (
    <div className="space-y-3">
      <input type="hidden" name="steps" value={JSON.stringify(steps)} />

      {commentMode && messageStepCount > 1 ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">
          اولین پیام به‌عنوان پاسخ خصوصی به کامنت فرستاده می‌شود و پیام‌های بعدی مستقیم به خود
          کاربر. طبق قوانین متا ممکن است پیام‌های بعدی تا وقتی کاربر جواب ندهد ارسال نشوند؛ در صفحهٔ
          گزارش‌ها می‌توانید ببینید کدام ارسال موفق بوده. اگر ارسال نشدند، در همان پیام اول یک{' '}
          <strong>دکمه</strong> بگذارید تا کاربر با زدنش گفتگو را باز کند.
        </p>
      ) : null}

      {steps.map((step, i) => (
        <div key={i} className="rounded-lg border border-neutral-200 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-medium text-neutral-500">گام {i + 1}</span>
            <Select
              value={step.actionType}
              onChange={(e) => update(i, emptyStep(e.target.value))}
              className="max-w-48"
            >
              {Object.entries(STEP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <span className="flex-1" />
            <Button type="button" variant="ghost" size="sm" onClick={() => move(i, -1)}>
              ↑
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => move(i, 1)}>
              ↓
            </Button>
            {steps.length > 1 ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)}>
                حذف
              </Button>
            ) : null}
          </div>

          {step.actionType === 'SEND_QUICK_REPLIES' ? (
            <div className="space-y-2">
              <Textarea
                rows={3}
                value={step.text ?? ''}
                onChange={(e) => update(i, { text: e.target.value })}
                placeholder="متن پیام…"
              />
              <Label htmlFor={`buttons-${i}`}>دکمه‌ها (هر خط یک دکمه)</Label>
              <Textarea
                id={`buttons-${i}`}
                rows={3}
                value={(step.buttons ?? []).join(NEWLINE)}
                onChange={(e) => update(i, { buttons: e.target.value.split(NEWLINE) })}
                placeholder={BUTTONS_PLACEHOLDER}
              />
              <p className="text-xs text-neutral-500">
                حداکثر ۱۳ دکمه، هرکدام تا ۲۰ کاراکتر. متن بلندتر کوتاه می‌شود.
              </p>
            </div>
          ) : null}

          {step.actionType === 'SEND_TEXT' ? (
            <Textarea
              rows={3}
              value={step.text ?? ''}
              onChange={(e) => update(i, { text: e.target.value })}
              placeholder="متن پیام…"
            />
          ) : null}

          {step.actionType === 'SEND_IMAGE' ? (
            <div className="space-y-2">
              <input
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                className="block w-full text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadFile(i, file);
                }}
              />
              {uploading === i ? (
                <p className="text-xs text-neutral-500">در حال آپلود…</p>
              ) : step.mediaUrl ? (
                <p className="text-xs text-green-700">
                  عکس آپلود شد ✅{' '}
                  <a href={step.mediaUrl} target="_blank" rel="noreferrer" className="underline">
                    دیدن
                  </a>
                </p>
              ) : (
                <p className="text-xs text-neutral-500">هنوز عکسی انتخاب نشده.</p>
              )}
              <Label htmlFor={`mediaUrl-${i}`}>یا آدرس مستقیم عکس</Label>
              <Input
                id={`mediaUrl-${i}`}
                dir="ltr"
                value={step.mediaUrl ?? ''}
                onChange={(e) => update(i, { mediaUrl: e.target.value })}
                placeholder="https://…"
              />
              <Label htmlFor={`caption-${i}`}>زیرنویس (اختیاری)</Label>
              <Input
                id={`caption-${i}`}
                value={step.caption ?? ''}
                onChange={(e) => update(i, { caption: e.target.value })}
              />
            </div>
          ) : null}

          {step.actionType === 'SEND_AUDIO' || step.actionType === 'SEND_VIDEO' ? (
            <div className="space-y-2">
              <input
                type="file"
                accept={
                  step.actionType === 'SEND_VIDEO'
                    ? 'video/mp4,.mp4'
                    : 'audio/mp4,audio/m4a,audio/x-m4a,audio/mpeg,.m4a,.mp3'
                }
                className="block w-full text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadFile(i, file);
                }}
              />
              {step.actionType === 'SEND_AUDIO' && canRecord ? (
                <Button
                  type="button"
                  variant={recordingIndex === i ? 'danger' : 'ghost'}
                  size="sm"
                  disabled={uploading !== null || (recordingIndex !== null && recordingIndex !== i)}
                  onClick={() => (recordingIndex === i ? stopRecording() : void startRecording(i))}
                >
                  {recordingIndex === i ? `⏹ پایان ضبط (${recordSeconds} ثانیه)` : '🎙 ضبط صدا'}
                </Button>
              ) : null}
              {step.actionType === 'SEND_AUDIO' && !canRecord ? (
                <p className="text-xs text-neutral-400">
                  ضبط مستقیم در این مرورگر ممکن نیست؛ با موبایل ضبط کنید و فایل را آپلود کنید.
                </p>
              ) : null}
              {uploading === i ? (
                <p className="text-xs text-neutral-500">در حال آپلود…</p>
              ) : step.mediaUrl ? (
                <p className="text-xs text-green-700">
                  فایل آپلود شد ✅{' '}
                  <a href={step.mediaUrl} target="_blank" rel="noreferrer" className="underline">
                    {step.actionType === 'SEND_VIDEO' ? 'دیدن' : 'گوش دادن'}
                  </a>
                </p>
              ) : (
                <p className="text-xs text-neutral-500">هنوز فایلی انتخاب نشده.</p>
              )}
              {uploadError ? <p className="text-xs text-red-700">{uploadError}</p> : null}
            </div>
          ) : null}

          {step.actionType === 'WAIT' ? (
            <Input
              type="number"
              min={1}
              max={60}
              dir="ltr"
              value={step.seconds ?? 3}
              onChange={(e) => update(i, { seconds: Number(e.target.value) })}
            />
          ) : null}

          <p className="mt-2 text-xs text-neutral-500">{STEP_HINTS[step.actionType]}</p>
        </div>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setSteps((prev) => [...prev, { actionType: 'SEND_TEXT', text: '' }])}
      >
        + افزودن گام
      </Button>
    </div>
  );
}
