import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@tavakoli/ui';
import {
  CONVERSATION_STATUS_LABELS,
  HANDOFF_REASON_LABELS,
  LEAD_STATUS_LABELS,
} from '@/lib/labels';
import { formatDateTimeFa } from '@/lib/dates';
import { assertClientAccess, requireUser } from '@/lib/guards';
import { prisma } from '@tavakoli/database';
import { ConversationPanel } from './conversation-panel';

export const dynamic = 'force-dynamic';

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const user = await requireUser();

  const conv = await prisma.conversation.findUnique({
    where: { id },
    include: {
      contact: { include: { lead: true } },
      instagramAccount: true,
      messages: { orderBy: { createdAt: 'asc' }, include: { automation: true, operator: true } },
      notes: { orderBy: { createdAt: 'asc' }, include: { author: true } },
    },
  });
  if (!conv) notFound();
  await assertClientAccess(user, conv.clientId);

  return (
    <div>
      <div className="mb-4">
        <Link href="/inbox" className="text-sm text-brand-dark hover:underline">
          ← بازگشت به صندوق
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Conversation thread */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>
              {conv.contact.displayName ?? conv.contact.username ?? 'مخاطب'}{' '}
              <span className="text-xs font-normal text-neutral-400">@{conv.instagramAccount.username}</span>
            </CardTitle>
            <Badge tone={conv.status === 'RESOLVED' ? 'success' : 'info'}>
              {CONVERSATION_STATUS_LABELS[conv.status]}
            </Badge>
          </CardHeader>
          <CardContent>
            {conv.needsHuman && conv.handoffReason ? (
              <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                نیازمند پاسخ انسانی — دلیل: {HANDOFF_REASON_LABELS[conv.handoffReason]}
              </div>
            ) : null}

            <div className="space-y-3">
              {conv.messages.map((m) => {
                const isInbound = m.direction === 'INBOUND';
                const isAutomation = m.senderType === 'AUTOMATION';
                return (
                  <div key={m.id} className={isInbound ? 'flex justify-start' : 'flex justify-end'}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        isInbound
                          ? 'bg-neutral-100 text-neutral-900'
                          : isAutomation
                            ? 'border border-brand/30 bg-brand/5 text-neutral-900'
                            : 'bg-brand text-white'
                      }`}
                    >
                      <p>{m.body}</p>
                      <div
                        className={`mt-1 text-[11px] ${isInbound || isAutomation ? 'text-neutral-400' : 'text-white/70'}`}
                      >
                        {isAutomation
                          ? `پاسخ خودکار${m.automation ? ` · ${m.automation.name}` : ''}`
                          : isInbound
                            ? 'پیام مشتری'
                            : `اپراتور${m.operator ? ` · ${m.operator.name}` : ''}`}
                        {' · '}
                        {formatDateTimeFa(m.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {conv.notes.length > 0 ? (
                <div className="mt-4 border-t border-dashed border-neutral-200 pt-3">
                  <div className="mb-2 text-xs font-medium text-amber-700">یادداشت‌های داخلی</div>
                  {conv.notes.map((n) => (
                    <div key={n.id} className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      <p>{n.body}</p>
                      <div className="mt-1 text-[11px] text-amber-600">
                        {n.author.name} · {formatDateTimeFa(n.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Contact / actions panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>اطلاعات مخاطب</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-neutral-700">
              <div>نام کاربری: @{conv.contact.username ?? '—'}</div>
              <div>تلفن: <span dir="ltr">{conv.contact.phone ?? '—'}</span></div>
              <div>
                وضعیت سرنخ:{' '}
                <Badge tone="info">
                  {conv.contact.lead ? LEAD_STATUS_LABELS[conv.contact.lead.status] : '—'}
                </Badge>
              </div>
              <Link href={`/contacts/${conv.contact.id}`} className="text-brand-dark hover:underline">
                مشاهده پروفایل مخاطب
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>اقدامات</CardTitle>
            </CardHeader>
            <CardContent>
              <ConversationPanel
                conversationId={conv.id}
                status={conv.status}
                automationPaused={conv.automationPaused}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
