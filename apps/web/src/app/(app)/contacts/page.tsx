import Link from 'next/link';
import { Badge, Button, Card, Input, Table, TD, TH, THead, TR } from '@tavakoli/ui';
import { PageHeader } from '@/components/page-header';
import { LEAD_STATUS_LABELS } from '@/lib/labels';
import { formatDateFa } from '@/lib/dates';
import { requireUser } from '@/lib/guards';
import { clientScope } from '@/server/queries';
import { prisma, type Prisma } from '@tavakoli/database';

export const dynamic = 'force-dynamic';

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; lead?: string }>;
}): Promise<React.ReactElement> {
  const { q, lead } = await searchParams;
  const user = await requireUser();
  const scope = await clientScope(user);

  const where: Prisma.ContactWhereInput = {
    ...scope,
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { displayName: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
          ],
        }
      : {}),
    ...(lead ? { lead: { status: lead as Prisma.EnumLeadStatusFilter['equals'] } } : {}),
  };

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { lastInteractionAt: 'desc' },
    take: 200,
    include: { lead: true, client: true },
  });

  const exportHref = `/contacts/export${q ? `?q=${encodeURIComponent(q)}` : ''}`;

  return (
    <div>
      <PageHeader
        title="مخاطبان"
        description="مشتریان و سرنخ‌های جمع‌آوری‌شده"
        action={
          <Link href={exportHref}>
            <Button size="sm" variant="outline">
              خروجی CSV
            </Button>
          </Link>
        }
      />

      <form className="mb-4 flex gap-2" action="/contacts">
        <Input name="q" defaultValue={q ?? ''} placeholder="جستجو بر اساس نام کاربری، نام یا تلفن" />
        <Button type="submit" size="sm">
          جستجو
        </Button>
      </form>

      <Card className="p-2">
        {contacts.length === 0 ? (
          <p className="p-6 text-center text-sm text-neutral-500">مخاطبی یافت نشد.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>نام کاربری</TH>
                <TH>نام</TH>
                <TH>تلفن</TH>
                <TH>مجموعه</TH>
                <TH>وضعیت سرنخ</TH>
                <TH>آخرین تعامل</TH>
              </TR>
            </THead>
            <tbody>
              {contacts.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link href={`/contacts/${c.id}`} className="font-medium text-brand-dark hover:underline">
                      @{c.username ?? '—'}
                    </Link>
                  </TD>
                  <TD>{c.displayName ?? '—'}</TD>
                  <TD dir="ltr" className="text-right">{c.phone ?? '—'}</TD>
                  <TD>{c.client.name}</TD>
                  <TD>
                    <Badge tone="info">{c.lead ? LEAD_STATUS_LABELS[c.lead.status] : '—'}</Badge>
                  </TD>
                  <TD>{formatDateFa(c.lastInteractionAt)}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
