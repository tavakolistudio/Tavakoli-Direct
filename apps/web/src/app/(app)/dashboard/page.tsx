import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@tavakoli/ui';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { formatRelativeFa } from '@/lib/dates';
import { requireUser } from '@/lib/guards';
import { getDashboardStats, clientScope } from '@/server/queries';
import { prisma } from '@tavakoli/database';

export const dynamic = 'force-dynamic';

export default async function DashboardPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  const stats = await getDashboardStats(user);
  const scope = await clientScope(user);

  const recent = await prisma.message.findMany({
    where: Object.keys(scope).length ? { conversation: scope } : {},
    orderBy: { createdAt: 'desc' },
    take: 8,
    include: { conversation: { include: { contact: true } } },
  });

  return (
    <div>
      <PageHeader
        title="داشبورد"
        description="نمای کلی فعالیت امروز"
        action={
          <>
            <Link href="/automations/new">
              <Button size="sm">ساخت اتوماسیون</Button>
            </Link>
            <Link href="/clients/new">
              <Button size="sm" variant="outline">
                افزودن مجموعه
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="پیج‌های متصل" value={stats.connectedAccounts} tone="brand" />
        <StatCard label="پیام‌های امروز" value={stats.incomingToday} />
        <StatCard label="پاسخ‌های خودکار امروز" value={stats.autoRepliesToday} />
        <StatCard label="پاسخ خصوصی کامنت امروز" value={stats.commentRepliesToday} />
        <StatCard label="سرنخ‌های امروز" value={stats.leadsToday} />
        <StatCard label="نیازمند پاسخ انسانی" value={stats.needsHuman} tone="warning" />
        <StatCard label="خطاهای وبهوک" value={stats.webhookErrors} tone="warning" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>فعالیت اخیر</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 ? (
              <p className="text-sm text-neutral-500">هنوز فعالیتی ثبت نشده است.</p>
            ) : (
              recent.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between border-b border-neutral-100 py-2 text-sm last:border-0"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-neutral-800">
                      {m.conversation.contact.displayName ??
                        m.conversation.contact.username ??
                        'مخاطب'}
                    </span>
                    <span className="mx-2 text-neutral-400">
                      {m.direction === 'INBOUND' ? 'پیام دریافتی' : 'پاسخ ارسالی'}
                    </span>
                    <span className="block truncate text-neutral-500">{m.body}</span>
                  </div>
                  <span className="shrink-0 text-xs text-neutral-400">
                    {formatRelativeFa(m.createdAt)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>اقدامات سریع</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/automations/new" className="block">
              <Button variant="outline" className="w-full justify-start">
                ساخت اتوماسیون
              </Button>
            </Link>
            <Link href="/clients/new" className="block">
              <Button variant="outline" className="w-full justify-start">
                افزودن مجموعه
              </Button>
            </Link>
            <Link href="/instagram-accounts" className="block">
              <Button variant="outline" className="w-full justify-start">
                اتصال پیج
              </Button>
            </Link>
            <Link href="/inbox?filter=needs_human" className="block">
              <Button variant="outline" className="w-full justify-start">
                مشاهده پیام‌های نیازمند پاسخ
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
