import { notFound } from 'next/navigation';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@tavakoli/ui';
import { PageHeader } from '@/components/page-header';
import { ACCOUNT_STATUS_LABELS, TOKEN_STATUS_LABELS, WEBHOOK_STATUS_LABELS } from '@/lib/labels';
import { formatRelativeFa, toPersianDigits } from '@/lib/dates';
import { assertClientAccess, requireUser } from '@/lib/guards';
import { prisma } from '@tavakoli/database';
import { ModerationForm } from './moderation-form';

export const dynamic = 'force-dynamic';

export default async function InstagramAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const user = await requireUser();

  const account = await prisma.instagramAccount.findFirst({
    where: { id, deletedAt: null },
    include: {
      client: true,
      _count: { select: { automations: { where: { deletedAt: null } }, conversations: true } },
    },
  });
  if (!account) notFound();
  await assertClientAccess(user, account.clientId);

  return (
    <div>
      <PageHeader title={`@${account.username}`} description={account.client.name} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>وضعیت اتصال</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-neutral-700">
            <div>
              وضعیت:{' '}
              <Badge tone={account.status === 'CONNECTED' ? 'success' : 'warning'}>
                {ACCOUNT_STATUS_LABELS[account.status]}
              </Badge>
            </div>
            <div>
              توکن:{' '}
              <Badge tone={account.tokenStatus === 'VALID' ? 'success' : 'warning'}>
                {TOKEN_STATUS_LABELS[account.tokenStatus]}
              </Badge>
            </div>
            <div>
              وبهوک:{' '}
              <Badge tone={account.webhookStatus === 'VERIFIED' ? 'success' : 'warning'}>
                {WEBHOOK_STATUS_LABELS[account.webhookStatus]}
              </Badge>
            </div>
            <div>آخرین وبهوک: {formatRelativeFa(account.lastWebhookAt)}</div>
            <div>اتوماسیون‌های فعال: {toPersianDigits(account._count.automations)}</div>
            <div>گفتگوها: {toPersianDigits(account._count.conversations)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>مدیریت کامنت‌ها (ضد اسپم)</CardTitle>
          </CardHeader>
          <CardContent>
            {user.role === 'ADMIN' ? (
              <ModerationForm
                accountId={account.id}
                enabled={account.moderationEnabled}
                words={account.bannedWords}
              />
            ) : (
              <p className="text-sm text-neutral-500">
                {account.moderationEnabled
                  ? `فعال — ${toPersianDigits(account.bannedWords.length)} کلمهٔ ممنوعه`
                  : 'غیرفعال'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
