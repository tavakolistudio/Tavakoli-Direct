import Link from 'next/link';
import { Badge, Button, Card, Table, TD, TH, THead, TR } from '@tavakoli/ui';
import { PageHeader } from '@/components/page-header';
import { formatDateFa } from '@/lib/dates';
import { requireUser } from '@/lib/guards';
import { clientScope } from '@/server/queries';
import { prisma } from '@tavakoli/database';

export const dynamic = 'force-dynamic';

export default async function ClientsPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  const scope = await clientScope(user);

  const clients = await prisma.client.findMany({
    where: { ...scope, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { instagramAccounts: true, automations: true } } },
  });

  return (
    <div>
      <PageHeader
        title="مجموعه‌ها"
        description="مدیریت مشتریان و پیج‌های آن‌ها"
        action={
          user.role === 'ADMIN' ? (
            <Link href="/clients/new">
              <Button size="sm">افزودن مجموعه</Button>
            </Link>
          ) : null
        }
      />

      <Card className="p-2">
        {clients.length === 0 ? (
          <p className="p-6 text-center text-sm text-neutral-500">هنوز مجموعه‌ای ثبت نشده است.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>نام مجموعه</TH>
                <TH>پیج‌ها</TH>
                <TH>اتوماسیون‌ها</TH>
                <TH>وضعیت</TH>
                <TH>تاریخ ایجاد</TH>
              </TR>
            </THead>
            <tbody>
              {clients.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link
                      href={`/clients/${c.id}`}
                      className="text-brand-dark font-medium hover:underline"
                    >
                      {c.name}
                    </Link>
                  </TD>
                  <TD>{c._count.instagramAccounts}</TD>
                  <TD>{c._count.automations}</TD>
                  <TD>
                    {c.isActive ? (
                      <Badge tone="success">فعال</Badge>
                    ) : (
                      <Badge tone="neutral">غیرفعال</Badge>
                    )}
                  </TD>
                  <TD>{formatDateFa(c.createdAt)}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
