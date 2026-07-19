import { notFound } from 'next/navigation';
import { Card, CardContent } from '@tavakoli/ui';
import { PageHeader } from '@/components/page-header';
import { requireAdmin } from '@/lib/guards';
import { prisma } from '@tavakoli/database';
import { EditClientForm } from './edit-client-form';

export const dynamic = 'force-dynamic';

export default async function ClientEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  await requireAdmin();

  const client = await prisma.client.findFirst({ where: { id, deletedAt: null } });
  if (!client) notFound();

  return (
    <div>
      <PageHeader title="ویرایش مجموعه" description={client.name} />
      <Card>
        <CardContent className="pt-6">
          <EditClientForm
            values={{
              id: client.id,
              name: client.name,
              description: client.description ?? '',
              phone: client.phone ?? '',
              whatsapp: client.whatsapp ?? '',
              website: client.website ?? '',
              timeZone: client.timeZone,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
