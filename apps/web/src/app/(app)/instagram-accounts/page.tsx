import Link from 'next/link';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TD,
  TH,
  THead,
  TR,
} from '@tavakoli/ui';
import { PageHeader } from '@/components/page-header';
import { ACCOUNT_STATUS_LABELS, TOKEN_STATUS_LABELS } from '@/lib/labels';
import { formatRelativeFa } from '@/lib/dates';
import { requireUser } from '@/lib/guards';
import { clientScope } from '@/server/queries';
import { prisma } from '@tavakoli/database';
import { getInstagramAppCredentials } from '@/server/instagram-oauth';
import { ConnectMockForm } from './connect-form';
import { ConnectInstagram } from './connect-instagram';
import { DeleteAccountButton } from './delete-account-button';

export const dynamic = 'force-dynamic';

const OAUTH_ERRORS: Record<string, string> = {
  not_configured: 'اعتبارنامه‌های اینستاگرام هنوز تنظیم نشده‌اند.',
  missing_client: 'ابتدا مجموعه را انتخاب کنید.',
  denied: 'دسترسی توسط کاربر رد شد.',
  missing_code: 'پاسخ اینستاگرام ناقص بود. دوباره تلاش کنید.',
  state_mismatch: 'اعتبارسنجی امنیتی ناموفق بود. دوباره تلاش کنید.',
  state_invalid: 'اعتبارسنجی امنیتی ناموفق بود. دوباره تلاش کنید.',
  exchange_failed: 'تبادل توکن با اینستاگرام ناموفق بود. تنظیمات اپ Meta را بررسی کنید.',
};

export default async function InstagramAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}): Promise<React.ReactElement> {
  const { connected, error } = await searchParams;
  const user = await requireUser();
  const scope = await clientScope(user);
  const igConfigured = getInstagramAppCredentials() !== null;

  const [accounts, clients] = await Promise.all([
    prisma.instagramAccount.findMany({
      where: { ...scope, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { client: true },
    }),
    user.role === 'ADMIN'
      ? prisma.client.findMany({
          where: { deletedAt: null, isActive: true },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <PageHeader title="پیج‌های اینستاگرام" description="وضعیت اتصال و توکن هر پیج" />

      {connected ? (
        <p className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          پیج <strong>@{connected}</strong> با موفقیت به‌صورت رسمی متصل شد. ✅
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {OAUTH_ERRORS[error] ?? 'اتصال ناموفق بود.'}
        </p>
      ) : null}

      {user.role === 'ADMIN' && clients.length > 0 ? (
        <>
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>اتصال رسمی پیج اینستاگرام</CardTitle>
            </CardHeader>
            <CardContent>
              <ConnectInstagram clients={clients} configured={igConfigured} />
              <p className="mt-3 text-xs text-neutral-500">
                با زدن این دکمه به صفحهٔ رسمی اینستاگرام می‌روید و پس از تأیید، پیج متصل می‌شود.
                توکن دسترسی به‌صورت رمزنگاری‌شده ذخیره می‌شود و هرگز در مرورگر نمایش داده نمی‌شود.
              </p>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader>
              <CardTitle>اتصال پیج آزمایشی (برای تست)</CardTitle>
            </CardHeader>
            <CardContent>
              <ConnectMockForm clients={clients} />
            </CardContent>
          </Card>
        </>
      ) : null}

      <Card className="p-2">
        {accounts.length === 0 ? (
          <p className="p-6 text-center text-sm text-neutral-500">هیچ پیجی متصل نشده است.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>نام کاربری</TH>
                <TH>مجموعه</TH>
                <TH>وضعیت</TH>
                <TH>توکن</TH>
                <TH>آخرین وبهوک</TH>
                <TH>اتوماسیون</TH>
                {user.role === 'ADMIN' ? <TH>عملیات</TH> : null}
              </TR>
            </THead>
            <tbody>
              {accounts.map((a) => (
                <TR key={a.id}>
                  <TD>
                    <Link
                      href={`/instagram-accounts/${a.id}`}
                      className="text-brand-dark font-medium hover:underline"
                    >
                      @{a.username}
                    </Link>
                  </TD>
                  <TD>{a.client.name}</TD>
                  <TD>
                    <Badge
                      tone={
                        a.status === 'CONNECTED'
                          ? 'success'
                          : a.status === 'ERROR'
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {ACCOUNT_STATUS_LABELS[a.status]}
                    </Badge>
                  </TD>
                  <TD>
                    <Badge tone={a.tokenStatus === 'VALID' ? 'success' : 'warning'}>
                      {TOKEN_STATUS_LABELS[a.tokenStatus]}
                    </Badge>
                  </TD>
                  <TD>{formatRelativeFa(a.lastWebhookAt)}</TD>
                  <TD>{a.automationEnabled ? 'فعال' : 'غیرفعال'}</TD>
                  {user.role === 'ADMIN' ? (
                    <TD>
                      <DeleteAccountButton accountId={a.id} username={a.username} />
                    </TD>
                  ) : null}
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
