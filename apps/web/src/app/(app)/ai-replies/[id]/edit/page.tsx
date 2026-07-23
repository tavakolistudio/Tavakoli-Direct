import { notFound } from 'next/navigation';
import { Card, CardContent } from '@tavakoli/ui';
import { PageHeader } from '@/components/page-header';
import { assertClientAccess, requireAdmin } from '@/lib/guards';
import { prisma } from '@tavakoli/database';
import { updateAiReplyAction } from '@/server/actions/ai-replies';
import { ensureAiSchema } from '@/server/ensure-ai-schema';
import { AiReplyForm } from '../../ai-reply-form';

export const dynamic = 'force-dynamic';

export default async function EditAiReplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const user = await requireAdmin();
  await ensureAiSchema();

  const automation = await prisma.automation.findFirst({
    where: { id, aiManaged: true, deletedAt: null },
    include: { trigger: true, steps: { orderBy: { order: 'asc' } }, instagramAccount: true },
  });
  if (!automation) notFound();
  await assertClientAccess(user, automation.clientId);

  const config = (automation.steps[0]?.config ?? {}) as {
    knowledge?: string;
    language?: string;
    replyMode?: string;
    instructions?: string;
    fallbackText?: string;
  };

  return (
    <div>
      <PageHeader
        title="ویرایش پاسخ هوشمند"
        description={`@${automation.instagramAccount.username}`}
      />
      <Card className="max-w-2xl">
        <CardContent className="pt-5">
          <AiReplyForm
            action={updateAiReplyAction}
            initial={{
              automationId: automation.id,
              knowledge: config.knowledge,
              language: config.language,
              replyMode: config.replyMode,
              instructions: config.instructions,
              fallbackText: config.fallbackText,
              mediaId: automation.trigger?.mediaId ?? null,
              enabled: automation.status === 'ACTIVE',
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
