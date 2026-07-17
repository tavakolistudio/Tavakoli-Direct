import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@tavakoli/ui';
import { PageHeader } from '@/components/page-header';
import { CONVERSATION_STATUS_LABELS, LEAD_STATUS_LABELS } from '@/lib/labels';
import { formatDateFa } from '@/lib/dates';
import { assertClientAccess, requireUser } from '@/lib/guards';
import { prisma } from '@tavakoli/database';

export const dynamic = 'force-dynamic';

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const user = await requireUser();

  const contact = await prisma.contact.findFirst({
    where: { id, deletedAt: null },
    include: {
      lead: true,
      client: true,
      instagramAccount: true,
      tags: { include: { tag: true } },
      conversations: { orderBy: { lastMessageAt: 'desc' } },
    },
  });
  if (!contact) notFound();
  await assertClientAccess(user, contact.clientId);

  return (
    <div>
      <PageHeader
        title={contact.displayName ?? contact.username ?? 'مخاطب'}
        description={`@${contact.username ?? '—'} · ${contact.client.name}`}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>اطلاعات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-neutral-700">
            <div>
              تلفن: <span dir="ltr">{contact.phone ?? '—'}</span>
            </div>
            <div>
              ایمیل: <span dir="ltr">{contact.email ?? '—'}</span>
            </div>
            <div>پیج: @{contact.instagramAccount.username}</div>
            <div>
              وضعیت سرنخ:{' '}
              <Badge tone="info">
                {contact.lead ? LEAD_STATUS_LABELS[contact.lead.status] : '—'}
              </Badge>
            </div>
            <div>اولین تعامل: {formatDateFa(contact.firstInteractionAt)}</div>
            <div>آخرین تعامل: {formatDateFa(contact.lastInteractionAt)}</div>
            {contact.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {contact.tags.map((t) => (
                  <Badge key={t.id} tone="brand">
                    {t.tag.name}
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>گفتگوها</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {contact.conversations.length === 0 ? (
              <p className="text-sm text-neutral-500">گفتگویی ثبت نشده است.</p>
            ) : (
              contact.conversations.map((c) => (
                <Link
                  key={c.id}
                  href={`/inbox/${c.id}`}
                  className="flex items-center justify-between border-b border-neutral-100 py-2 text-sm last:border-0 hover:bg-neutral-50"
                >
                  <span>گفتگو {formatDateFa(c.createdAt)}</span>
                  <Badge tone="info">{CONVERSATION_STATUS_LABELS[c.status]}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
