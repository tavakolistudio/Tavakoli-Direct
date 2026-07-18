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
                  گام {toPersianDigits(s.order + 1)} — {s.actionType}
                </div>
                <div className="mt-1 text-neutral-800">
                  {typeof (s.config as { text?: string }).text === 'string'
                    ? (s.config as { text?: string }).text
                    : JSON.stringify(s.config)}
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
