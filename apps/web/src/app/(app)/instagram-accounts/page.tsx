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
import { ConnectMockForm } from './connect-form';

export const dynamic = 'force-dynamic';

export default async function InstagramAccountsPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  const scope = await clientScope(user);

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

      {user.role === 'ADMIN' && clients.length > 0 ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>اتصال پیج (حالت آزمایشی)</CardTitle>
          </CardHeader>
          <CardContent>
            <ConnectMockForm clients={clients} />
            <p className="mt-3 text-xs text-neutral-500">
              اتصال رسمی از طریق Meta در بخش تنظیمات ← یکپارچه‌سازی‌ها انجام می‌شود و تا زمان تنظیم
              اعتبارنامه‌ها غیرفعال است.
            </p>
          </CardContent>
        </Card>
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
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
