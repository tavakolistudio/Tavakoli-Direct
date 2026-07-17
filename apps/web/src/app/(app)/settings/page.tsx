import Link from 'next/link';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@tavakoli/ui';
import { APP_NAME, env } from '@tavakoli/config';
import { PageHeader } from '@/components/page-header';
import { requireUser } from '@/lib/guards';

export const dynamic = 'force-dynamic';

export default async function SettingsPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  const isAdmin = user.role === 'ADMIN';

  return (
    <div>
      <PageHeader title="تنظیمات" description="پیکربندی پلتفرم و یکپارچه‌سازی‌ها" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>پلتفرم</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-neutral-700">
            <div>نام: {APP_NAME}</div>
            <div>منطقه زمانی پیش‌فرض: Asia/Tehran</div>
            <div>
              حالت ارائه‌دهنده:{' '}
              <Badge tone={env.INSTAGRAM_PROVIDER === 'mock' ? 'info' : 'success'}>
                {env.INSTAGRAM_PROVIDER === 'mock' ? 'آزمایشی (Mock)' : 'Meta'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>تشخیص محیط</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-neutral-700">
            <div>محیط: {env.NODE_ENV}</div>
            <div>نسخه Graph API: {env.META_GRAPH_API_VERSION}</div>
            <div>نگه‌داری وبهوک: {env.WEBHOOK_PAYLOAD_RETENTION_DAYS} روز</div>
          </CardContent>
        </Card>

        {isAdmin ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>یکپارچه‌سازی Meta</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href="/settings/integrations/meta"
                  className="text-brand-dark hover:underline"
                >
                  مشاهده وضعیت اتصال و وبهوک
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>گزارش رخدادها</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href="/settings/audit-logs" className="text-brand-dark hover:underline">
                  مشاهده audit logs
                </Link>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
}
