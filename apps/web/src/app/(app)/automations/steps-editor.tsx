'use client';

import { useState } from 'react';
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
}

const STEP_LABELS: Record<string, string> = {
  SEND_TEXT: 'ارسال متن',
  SEND_IMAGE: 'ارسال عکس',
  WAIT: 'مکث',
  NEEDS_HUMAN: 'ارجاع به اپراتور',
};

const STEP_HINTS: Record<string, string> = {
  SEND_TEXT: 'برای کامنت، این پیام به‌صورت دایرکت برای کامنت‌گذار می‌رود.',
  SEND_IMAGE: 'عکس باید روی یک آدرس اینترنتی عمومی باشد تا اینستاگرام بتواند بخواندش.',
  WAIT: 'کمی صبر می‌کند تا پیام‌ها پشت سر هم و طبیعی‌تر برسند.',
  NEEDS_HUMAN: 'گفتگو به کارتابل اپراتور می‌رود تا انسان جواب دهد.',
};

function emptyStep(actionType: string): StepDraft {
  return actionType === 'WAIT' ? { actionType, seconds: 3 } : { actionType };
}

export function StepsEditor({ initial }: { initial: StepDraft[] }): React.ReactElement {
  const [steps, setSteps] = useState<StepDraft[]>(
    initial.length > 0 ? initial : [{ actionType: 'SEND_TEXT', text: '' }],
  );

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

  return (
    <div className="space-y-3">
      <input type="hidden" name="steps" value={JSON.stringify(steps)} />

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
              <Label htmlFor={`mediaUrl-${i}`}>آدرس عکس</Label>
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
