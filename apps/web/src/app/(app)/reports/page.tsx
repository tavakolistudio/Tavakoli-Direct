import { Card, CardContent, CardHeader, CardTitle } from '@tavakoli/ui';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { requireUser } from '@/lib/guards';
import { clientScope } from '@/server/queries';
import { prisma } from '@tavakoli/database';

export const dynamic = 'force-dynamic';

export default async function ReportsPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  const scope = await clientScope(user);
  const convScope = Object.keys(scope).length ? { conversation: scope } : {};

  const [
    incoming,
    autoResponses,
    humanResponses,
    commentReplies,
    leads,
    transferred,
    unresolved,
    executions,
    failures,
  ] = await Promise.all([
    prisma.message.count({ where: { direction: 'INBOUND', ...convScope } }),
    prisma.message.count({ where: { direction: 'OUTBOUND', senderType: 'AUTOMATION', ...convScope } }),
    prisma.message.count({ where: { direction: 'OUTBOUND', senderType: 'OPERATOR', ...convScope } }),
    prisma.message.count({ where: { type: 'STORY_REPLY', ...convScope } }),
    prisma.contact.count({ where: { ...scope } }),
    prisma.conversation.count({ where: { ...scope, needsHuman: true } }),
    prisma.conversation.count({ where: { ...scope, status: { not: 'RESOLVED' } } }),
    prisma.automationExecution.count({ where: { automation: scope } }),
    prisma.automationExecution.count({ where: { automation: scope, status: 'FAILED' } }),
  ]);

  const byClient = await prisma.conversation.groupBy({
    by: ['clientId'],
    where: { ...scope },
    _count: { _all: true },
  });
  const clientNames = await prisma.client.findMany({
    where: { id: { in: byClient.map((b) => b.clientId) } },
    select: { id: true, name: true },
  });
  const nameOf = (cid: string): string => clientNames.find((c) => c.id === cid)?.name ?? cid;

  return (
    <div>
      <PageHeader title="گزارش‌ها" description="آمار بر پایه رویدادها و پیام‌های ثبت‌شده" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="پیام‌های دریافتی" value={incoming} />
        <StatCard label="پاسخ‌های خودکار" value={autoResponses} />
        <StatCard label="پاسخ‌های انسانی" value={humanResponses} />
        <StatCard label="پاسخ خصوصی کامنت" value={commentReplies} />
        <StatCard label="سرنخ‌های جمع‌آوری‌شده" value={leads} />
        <StatCard label="ارجاع به اپراتور" value={transferred} tone="warning" />
        <StatCard label="گفتگوهای باز" value={unresolved} tone="warning" />
        <StatCard label="اجرای اتوماسیون‌ها" value={executions} />
        <StatCard label="خطای اتوماسیون‌ها" value={failures} tone="warning" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>فعالیت بر اساس مجموعه</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {byClient.length === 0 ? (
            <p className="text-neutral-500">داده‌ای برای نمایش نیست.</p>
          ) : (
            byClient.map((b) => (
              <div key={b.clientId} className="flex justify-between border-b border-neutral-100 py-2 last:border-0">
                <span>{nameOf(b.clientId)}</span>
                <span className="tabular-fa text-neutral-600">{b._count._all} گفتگو</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-neutral-400">
        هر عدد مستقیماً از پیام‌ها و رویدادهای ذخیره‌شده محاسبه می‌شود.
      </p>
    </div>
  );
}
