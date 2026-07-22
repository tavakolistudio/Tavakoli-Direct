import Link from 'next/link';
import { Card, CardContent } from '@tavakoli/ui';
import { PageHeader } from '@/components/page-header';
import { requireAdmin } from '@/lib/guards';
import { prisma } from '@tavakoli/database';
import { createAiReplyAction } from '@/server/actions/ai-replies';
import { AiReplyForm } from '../ai-reply-form';

export const dynamic = 'force-dynamic';

export default async function NewAiReplyPage(): Promise<React.ReactElement> {
  await requireAdmin();
  const accounts = await prisma.instagramAccount.findMany({
    where: { deletedAt: null },
    include: { client: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <PageHeader
        title="پاسخ هوشمند جدید"
        description="اطلاعات مجموعه را وارد کنید تا هوش مصنوعی به کامنت‌ها پاسخ دهد"
      />
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-neutral-500">
            ابتدا یک پیج اینستاگرام متصل کنید.{' '}
            <Link href="/instagram-accounts" className="text-brand-dark hover:underline">
              اتصال پیج
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-2xl">
          <CardContent className="pt-5">
            <AiReplyForm
              action={createAiReplyAction}
              accounts={accounts.map((a) => ({
                id: a.id,
                username: a.username,
                clientName: a.client.name,
              }))}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
