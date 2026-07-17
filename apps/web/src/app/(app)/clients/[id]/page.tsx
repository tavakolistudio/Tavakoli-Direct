import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@tavakoli/ui';
import { PageHeader } from '@/components/page-header';
import { ACCOUNT_STATUS_LABELS } from '@/lib/labels';
import { formatDateFa } from '@/lib/dates';
import { assertClientAccess } from '@/lib/guards';
import { requireUser } from '@/lib/guards';
import { prisma } from '@tavakoli/database';

export const dynamic = 'force-dynamic';

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const user = await requireUser();
  await assertClientAccess(user, id);

  const client = await prisma.client.findFirst({
    where: { id, deletedAt: null },
    include: {
      instagramAccounts: { where: { deletedAt: null } },
      _count: { select: { automations: true, contacts: true, conversations: true } },
    },
  });
  if (!client) notFound();

  return (
    <div>
      <PageHeader title={client.name} description={client.description ?? 'بدون توضیح'} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>اطلاعات تماس</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-neutral-700">
            <div>
              تلفن: <span dir="ltr">{client.phone ?? '—'}</span>
            </div>
            <div>
              واتساپ: <span dir="ltr">{client.whatsapp ?? '—'}</span>
            </div>
            <div>
              وب‌سایت: <span dir="ltr">{client.website ?? '—'}</span>
            </div>
            <div>منطقه زمانی: {client.timeZone}</div>
            <div>ایجاد: {formatDateFa(client.createdAt)}</div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>پیج‌های اینستاگرام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {client.instagramAccounts.length === 0 ? (
              <p className="text-sm text-neutral-500">
                پیجی متصل نشده است.{' '}
                <Link href="/instagram-accounts" className="text-brand-dark hover:underline">
                  اتصال پیج
                </Link>
              </p>
            ) : (
              client.instagramAccounts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between border-b border-neutral-100 py-2 last:border-0"
                >
                  <Link
                    href={`/instagram-accounts/${a.id}`}
                    className="text-brand-dark font-medium hover:underline"
                  >
                    @{a.username}
                  </Link>
                  <Badge tone={a.status === 'CONNECTED' ? 'success' : 'warning'}>
                    {ACCOUNT_STATUS_LABELS[a.status]}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
