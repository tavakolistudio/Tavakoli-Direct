import { Badge, Card, CardContent, CardHeader, CardTitle } from '@tavakoli/ui';
import { env } from '@tavakoli/config';
import { PageHeader } from '@/components/page-header';
import { requireAdmin } from '@/lib/guards';

export const dynamic = 'force-dynamic';

/** Mask a secret so only its presence (not value) is shown. */
function maskPresence(value: string | undefined): string {
  return value ? 'تنظیم شده ✓' : 'تنظیم نشده';
}

export default async function MetaIntegrationPage(): Promise<React.ReactElement> {
  await requireAdmin();
  const isMeta = env.INSTAGRAM_PROVIDER === 'meta';
  const webhookUrl = `${env.APP_URL}/api/webhooks/instagram`;

  return (
    <div>
      <PageHeader title="یکپارچه‌سازی Meta" description="وضعیت اتصال رسمی به Instagram Graph API" />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>وضعیت</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-neutral-700">
          <div>
            حالت فعلی:{' '}
            <Badge tone={isMeta ? 'success' : 'info'}>
              {isMeta ? 'Meta فعال' : 'آزمایشی (Mock)'}
            </Badge>
          </div>
          {!isMeta ? (
            <p className="rounded bg-blue-50 px-3 py-2 text-blue-800">
              اتصال رسمی Meta غیرفعال است. برای فعال‌سازی، اعتبارنامه‌های Meta را در متغیرهای محیطی
              تنظیم و <code dir="ltr">INSTAGRAM_PROVIDER=meta</code> کنید. راهنما در
              docs/META_SETUP.md.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>وبهوک</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-neutral-700">
          <div>
            آدرس وبهوک: <code dir="ltr">{webhookUrl}</code>
          </div>
          <div>توکن تأیید (Verify Token): {maskPresence(env.META_VERIFY_TOKEN)}</div>
          <div>
            وضعیت تأیید امضا: {isMeta ? 'با هر رویداد بررسی می‌شود' : 'در حالت آزمایشی غیرفعال'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>اعتبارنامه‌ها (بدون نمایش مقدار)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-neutral-700">
          <div>App ID: {maskPresence(env.META_APP_ID)}</div>
          <div>App Secret: {maskPresence(env.META_APP_SECRET)}</div>
          <div>Redirect URI: {maskPresence(env.META_REDIRECT_URI)}</div>
          <p className="pt-2 text-xs text-neutral-400">
            مقادیر محرمانه هرگز به‌صورت کامل نمایش داده نمی‌شوند.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
