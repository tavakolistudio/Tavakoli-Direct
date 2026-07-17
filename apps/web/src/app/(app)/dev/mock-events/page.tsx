import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@tavakoli/ui';
import { isProduction } from '@tavakoli/config';
import { PageHeader } from '@/components/page-header';
import { requireAdmin } from '@/lib/guards';
import { MockPanel } from './mock-panel';

export const dynamic = 'force-dynamic';

export default async function MockEventsPage(): Promise<React.ReactElement> {
  // This tool must never be available in production.
  if (isProduction()) notFound();
  await requireAdmin();

  return (
    <div>
      <PageHeader
        title="ابزار رویدادهای آزمایشی"
        description="تولید رویدادهای اینستاگرام برای توسعه — فقط در محیط توسعه"
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>تولید رویداد</CardTitle>
        </CardHeader>
        <CardContent>
          <MockPanel />
          <p className="mt-4 text-xs text-neutral-400">
            رویدادهای تولیدشده از همان مسیر نرمال‌سازی، بررسی تکراری و صف پردازش رویدادهای واقعی عبور
            می‌کنند. برای پردازش کامل، Redis و سرویس worker باید در حال اجرا باشند.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
