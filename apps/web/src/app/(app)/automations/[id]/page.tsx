import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@tavakoli/ui';
import { PageHeader } from '@/components/page-header';
import { AUTOMATION_STATUS_LABELS, MATCH_MODE_LABELS, TRIGGER_LABELS } from '@/lib/labels';
import { toPersianDigits } from '@/lib/dates';
import { assertClientAccess, requireUser } from '@/lib/guards';
import { prisma } from '@tavakoli/database';
import { DryRunTester } from './dry-run-tester';
import { StatusControls } from './status-controls';

export const dynamic = 'force-dynamic';

const STEP_TYPE_LABELS: Record<string, string> = {
  SEND_TEXT: 'ارسال متن',
  SEND_QUICK_REPLIES: 'متن + دکمه',
  SEND_IMAGE: 'ارسال عکس',
  SEND_AUDIO: 'ارسال صدا',
  SEND_VIDEO: 'ارسال فیلم',
  WAIT: 'مکث',
  NEEDS_HUMAN: 'ارجاع به اپراتور',
};

/** Human-readable one-liner for a step; raw config is never shown to users. */
function describeStep(actionType: string, config: unknown): React.ReactNode {
  const cfg = (config ?? {}) as {
    text?: string;
    caption?: string;
    mediaUrl?: string;
    seconds?: number;
    buttons?: Array<string | { title?: string; url?: string }>;
  };
  switch (actionType) {
    case 'SEND_TEXT':
      return cfg.text ?? '—';
    case 'SEND_QUICK_REPLIES':
      return (
        <>
          {cfg.text ?? '—'}
          {cfg.buttons?.length ? (
            <span className="mt-1 flex flex-wrap gap-1">
              {cfg.buttons.map((b, i) => {
                const title = typeof b === 'string' ? b : (b.title ?? '');
                const url = typeof b === 'string' ? undefined : b.url;
                return (
                  <span key={i} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">
                    {title}
                    {url ? ' 🔗' : ''}
                  </span>
                );
              })}
            </span>
          ) : null}
        </>
      );
    case 'SEND_IMAGE':
    case 'SEND_AUDIO':
    case 'SEND_VIDEO': {
      const noun =
        actionType === 'SEND_IMAGE' ? 'عکس' : actionType === 'SEND_AUDIO' ? 'فایل صوتی' : 'ویدیو';
      return (
        <>
          {cfg.caption ? `${cfg.caption} — ` : ''}
          {cfg.mediaUrl ? (
            <a
              href={cfg.mediaUrl}
              target="_blank"
              rel="noreferrer"
              className="text-brand-dark underline"
            >
              دیدن {noun}
            </a>
          ) : (
            `${noun} تنظیم نشده`
          )}
        </>
      );
    }
    case 'WAIT':
      return `${toPersianDigits(cfg.seconds ?? 3)} ثانیه مکث`;
    case 'NEEDS_HUMAN':
      return 'گفتگو به کارتابل اپراتور منتقل می‌شود.';
    default:
      return '—';
  }
}

export default async function AutomationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const user = await requireUser();

  const automation = await prisma.automation.findFirst({
    where: { id, deletedAt: null },
    include: {
      trigger: true,
      steps: { orderBy: { order: 'asc' } },
      client: true,
      instagramAccount: true,
    },
  });
  if (!automation) notFound();
  await assertClientAccess(user, automation.clientId);

  return (
    <div>
      <PageHeader
        title={automation.name}
        description={`${automation.client.name} — @${automation.instagramAccount.username}`}
        action={
          user.role === 'ADMIN' ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/automations/${automation.id}/edit`}
                className="border-brand text-brand-dark hover:bg-brand/5 rounded-lg border px-3 py-1.5 text-sm font-medium"
              >
                ویرایش
              </Link>
              <StatusControls automationId={automation.id} status={automation.status} />
            </div>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>پیکربندی</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-neutral-700">
            <div>
              وضعیت:{' '}
              <Badge tone={automation.status === 'ACTIVE' ? 'success' : 'neutral'}>
                {AUTOMATION_STATUS_LABELS[automation.status]}
              </Badge>
            </div>
            <div>محرک: {automation.trigger ? TRIGGER_LABELS[automation.trigger.type] : '—'}</div>
            {automation.trigger?.matchMode ? (
              <div>نوع تطابق: {MATCH_MODE_LABELS[automation.trigger.matchMode]}</div>
            ) : null}
            {automation.trigger && automation.trigger.keywords.length > 0 ? (
              <div>کلمات کلیدی: {automation.trigger.keywords.join('، ')}</div>
            ) : null}
            {automation.trigger?.type === 'COMMENT_KEYWORD' ? (
              automation.trigger.matchAnyComment ? (
                <div className="rounded-lg bg-blue-50 px-3 py-2 text-blue-900">
                  به هر کامنتی زیر پست انتخاب‌شده پاسخ می‌دهد (بدون نیاز به کلمهٔ کلیدی)
                  <span dir="ltr" className="mr-1 text-xs text-blue-700">
                    ({automation.trigger.mediaId})
                  </span>
                  .
                </div>
              ) : automation.trigger.mediaId ? (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                  ⚠️ فقط روی کامنت‌های یک پست خاص کار می‌کند
                  <span dir="ltr" className="mr-1 text-xs text-amber-700">
                    ({automation.trigger.mediaId})
                  </span>
                  . کامنت زیر بقیهٔ پست‌ها نادیده گرفته می‌شود — برای فعال‌شدن روی همهٔ پست‌ها، در
                  ویرایش «برداشتن محدودیت پست» را بزنید.
                </div>
              ) : (
                <div className="text-neutral-500">روی کامنت همهٔ پست‌ها فعال است.</div>
              )
            ) : null}
            {automation.trigger?.requireFollow ? (
              <div className="text-neutral-500">
                فقط به دنبال‌کنندگان پیج پاسخ می‌دهد (فالو اجباری)
              </div>
            ) : null}
            <div>اولویت: {toPersianDigits(automation.priority)}</div>
            <div>فاصله زمانی: {toPersianDigits(automation.cooldownSeconds)} ثانیه</div>
            <div>تعداد اجرا: {toPersianDigits(automation.executionCount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>گام‌های پاسخ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {automation.steps.map((s) => (
              <div key={s.id} className="rounded-lg border border-neutral-100 p-3">
                <div className="text-xs text-neutral-400">
                  گام {toPersianDigits(s.order + 1)} —{' '}
                  {STEP_TYPE_LABELS[s.actionType] ?? s.actionType}
                </div>
                <div className="mt-1 break-words text-neutral-800">
                  {describeStep(s.actionType, s.config)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>گام آزمایش (بدون ارسال واقعی)</CardTitle>
        </CardHeader>
        <CardContent>
          <DryRunTester accountId={automation.instagramAccountId} />
        </CardContent>
      </Card>
    </div>
  );
}
