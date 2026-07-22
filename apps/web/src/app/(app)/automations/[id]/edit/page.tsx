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

  const steps = automation.steps.map((s) => {
    const cfg = (s.config ?? {}) as {
      text?: string;
      mediaUrl?: string;
      caption?: string;
      seconds?: number;
      buttons?: Array<string | { title?: string; url?: string }>;
    };
    return {
      actionType: s.actionType as string,
      text: cfg.text ?? '',
      mediaUrl: cfg.mediaUrl ?? '',
      caption: cfg.caption ?? '',
      seconds: cfg.seconds ?? 3,
      buttons: (cfg.buttons ?? []).map((b) =>
        typeof b === 'string' ? b : b.url ? `${b.title ?? ''} | ${b.url}` : (b.title ?? ''),
      ),
    };
  });

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
              steps,
              priority: automation.priority,
              cooldownSeconds: automation.cooldownSeconds,
              accountId: automation.instagramAccountId,
              requireFollow: automation.trigger?.requireFollow ?? false,
              followPrompt: automation.trigger?.followPrompt ?? '',
              mediaId: automation.trigger?.mediaId ?? '',
              matchAnyComment: automation.trigger?.matchAnyComment ?? false,
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
