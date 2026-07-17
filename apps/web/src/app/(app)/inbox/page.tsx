import Link from 'next/link';
import { Badge, Card } from '@tavakoli/ui';
import { PageHeader } from '@/components/page-header';
import { CONVERSATION_STATUS_LABELS } from '@/lib/labels';
import { formatRelativeFa } from '@/lib/dates';
import { requireUser } from '@/lib/guards';
import { clientScope } from '@/server/queries';
import { prisma, type Prisma } from '@tavakoli/database';

export const dynamic = 'force-dynamic';

const FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'همه' },
  { key: 'needs_human', label: 'نیازمند پاسخ' },
  { key: 'follow_up', label: 'در حال پیگیری' },
  { key: 'waiting', label: 'منتظر مشتری' },
  { key: 'resolved', label: 'بسته شده' },
  { key: 'assigned', label: 'واگذار شده به من' },
];

function filterWhere(filter: string, userId: string): Prisma.ConversationWhereInput {
  switch (filter) {
    case 'needs_human':
      return { needsHuman: true, status: { not: 'RESOLVED' } };
    case 'follow_up':
      return { status: 'FOLLOW_UP' };
    case 'waiting':
      return { status: 'WAITING_CUSTOMER' };
    case 'resolved':
      return { status: 'RESOLVED' };
    case 'assigned':
      return { assignments: { some: { userId, unassignedAt: null } } };
    default:
      return {};
  }
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}): Promise<React.ReactElement> {
  const { filter = 'all' } = await searchParams;
  const user = await requireUser();
  const scope = await clientScope(user);

  const conversations = await prisma.conversation.findMany({
    where: { ...scope, ...filterWhere(filter, user.id) },
    orderBy: { lastMessageAt: 'desc' },
    take: 100,
    include: {
      contact: true,
      instagramAccount: true,
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  return (
    <div>
      <PageHeader title="صندوق پیام‌ها" description="گفتگوهای مشترک تیم" />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/inbox?filter=${f.key}`}
            className={`rounded-full px-3 py-1.5 text-sm ${
              filter === f.key ? 'bg-brand text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Card className="divide-y divide-neutral-100">
        {conversations.length === 0 ? (
          <p className="p-6 text-center text-sm text-neutral-500">گفتگویی در این نما وجود ندارد.</p>
        ) : (
          conversations.map((c) => (
            <Link key={c.id} href={`/inbox/${c.id}`} className="block p-4 hover:bg-neutral-50">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-900">
                      {c.contact.displayName ?? c.contact.username ?? 'مخاطب'}
                    </span>
                    <span className="text-xs text-neutral-400">@{c.instagramAccount.username}</span>
                    {c.needsHuman ? <Badge tone="warning">نیازمند پاسخ</Badge> : null}
                    {c.automationPaused ? <Badge tone="neutral">اتوماسیون متوقف</Badge> : null}
                  </div>
                  <p className="mt-1 truncate text-sm text-neutral-500">
                    {c.messages[0]?.body ?? '—'}
                  </p>
                </div>
                <div className="shrink-0 text-left">
                  <Badge tone={c.status === 'RESOLVED' ? 'success' : 'info'}>
                    {CONVERSATION_STATUS_LABELS[c.status]}
                  </Badge>
                  <div className="mt-1 text-xs text-neutral-400">{formatRelativeFa(c.lastMessageAt)}</div>
                </div>
              </div>
            </Link>
          ))
        )}
      </Card>
    </div>
  );
}
