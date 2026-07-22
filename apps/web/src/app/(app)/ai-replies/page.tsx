import Link from 'next/link';
import { Badge, Button, Card, Table, TD, TH, THead, TR } from '@tavakoli/ui';
import { PageHeader } from '@/components/page-header';
import { requireUser } from '@/lib/guards';
import { clientScope } from '@/server/queries';
import { prisma } from '@tavakoli/database';
import { ensureAiSchema } from '@/server/ensure-ai-schema';
import { AiReplyRowActions } from './ai-reply-row-actions';

export const dynamic = 'force-dynamic';

const LANGUAGE_LABELS: Record<string, string> = {
  auto: 'خودکار',
  fa: 'فارسی',
  tr: 'ترکی',
  en: 'انگلیسی',
};

export default async function AiRepliesPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  await ensureAiSchema();
  const scope = await clientScope(user);

  const replies = await prisma.automation.findMany({
    where: { ...scope, deletedAt: null, aiManaged: true },
    orderBy: { createdAt: 'desc' },
    include: { trigger: true, steps: true, client: true, instagramAccount: true },
  });

  const isAdmin = user.role === 'ADMIN';

  return (
    <div>
      <PageHeader
        title="پاسخ هوشمند"
        description="پاسخ خودکار به کامنت‌ها با هوش مصنوعی، بر اساس اطلاعاتی که می‌دهید"
        action={
          isAdmin ? (
            <Link href="/ai-replies/new">
              <Button size="sm">پاسخ هوشمند جدید</Button>
            </Link>
          ) : null
        }
      />

      <Card className="p-2">
        {replies.length === 0 ? (
          <div className="p-6 text-center text-sm text-neutral-500">
            هنوز پاسخ هوشمندی نساخته‌اید.
            {isAdmin ? (
              <>
                {' '}
                <Link href="/ai-replies/new" className="text-brand-dark hover:underline">
                  ساخت اولین پاسخ هوشمند
                </Link>
              </>
            ) : null}
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>پیج</TH>
                <TH>مجموعه</TH>
                <TH>دامنه</TH>
                <TH>زبان</TH>
                <TH>وضعیت</TH>
                {isAdmin ? <TH>عملیات</TH> : null}
              </TR>
            </THead>
            <tbody>
              {replies.map((r) => {
                const config = (r.steps[0]?.config ?? {}) as { language?: string };
                return (
                  <TR key={r.id}>
                    <TD>@{r.instagramAccount.username}</TD>
                    <TD>{r.client.name}</TD>
                    <TD>
                      {r.trigger?.mediaId ? (
                        <span className="text-amber-600" title={r.trigger.mediaId}>
                          یک پست خاص 📌
                        </span>
                      ) : (
                        'همهٔ کامنت‌های پیج'
                      )}
                    </TD>
                    <TD>{LANGUAGE_LABELS[config.language ?? 'auto']}</TD>
                    <TD>
                      <Badge tone={r.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {r.status === 'ACTIVE' ? 'فعال' : 'غیرفعال'}
                      </Badge>
                    </TD>
                    {isAdmin ? (
                      <TD>
                        <AiReplyRowActions automationId={r.id} enabled={r.status === 'ACTIVE'} />
                      </TD>
                    ) : null}
                  </TR>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
