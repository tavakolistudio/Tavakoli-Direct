import { notFound } from 'next/navigation';
import { Card, CardContent } from '@tavakoli/ui';
import { PageHeader } from '@/components/page-header';
import { requireAdmin } from '@/lib/guards';
import { assertClientAccess } from '@/lib/guards';
import { prisma } from '@tavakoli/database';
import { AutomationEditForm } from './edit-form';

export const dynamic = 'force-dynamic';

export default async function AutomationEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const user = await requireAdmin();

  const automation = await prisma.automation.findFirst({
    where: { id, deletedAt: null },
    include: {
      trigger: true,
      steps: { orderBy: { order: 'asc' } },
      client: true,
      instagramAccount: true,
    },
  });
  if (!automation) notFound();
  await assertClientAccess(user, automation.clientId);

  const textStep = automation.steps.find((s) => s.actionType === 'SEND_TEXT');
  const responseText = ((textStep?.config as { text?: string } | null)?.text ?? '').toString();

  return (
    <div>
      <PageHeader
        title="ویرایش اتوماسیون"
        description={`${automation.client.name} — @${automation.instagramAccount.username}`}
      />
      <Card>
        <CardContent className="pt-6">
          <AutomationEditForm
            values={{
              id: automation.id,
              name: automation.name,
              triggerType: automation.trigger?.type ?? 'DM_KEYWORD',
              matchMode: automation.trigger?.matchMode ?? 'CONTAINS',
              keywords: (automation.trigger?.keywords ?? []).join('، '),
              responseText,
              priority: automation.priority,
              cooldownSeconds: automation.cooldownSeconds,
              mediaId: automation.trigger?.mediaId ?? '',
              publicReplies: (automation.trigger?.publicReplies?.length
                ? automation.trigger.publicReplies
                : [automation.trigger?.publicReply].filter(Boolean)
              ).join('\n'),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
