import { Card, Table, TD, TH, THead, TR } from '@tavakoli/ui';
import { PageHeader } from '@/components/page-header';
import { formatDateTimeFa } from '@/lib/dates';
import { requireAdmin } from '@/lib/guards';
import { prisma } from '@tavakoli/database';

export const dynamic = 'force-dynamic';

export default async function AuditLogsPage(): Promise<React.ReactElement> {
  await requireAdmin();
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { actor: true },
  });

  return (
    <div>
      <PageHeader title="گزارش رخدادها" description="ثبت اقدامات مهم (بدون هیچ مقدار محرمانه)" />
      <Card className="p-2">
        <Table>
          <THead>
            <TR>
              <TH>زمان</TH>
              <TH>کاربر</TH>
              <TH>اقدام</TH>
              <TH>موجودیت</TH>
              <TH>IP</TH>
            </TR>
          </THead>
          <tbody>
            {logs.map((l) => (
              <TR key={l.id}>
                <TD>{formatDateTimeFa(l.createdAt)}</TD>
                <TD>{l.actor?.name ?? 'سیستم'}</TD>
                <TD dir="ltr" className="text-right">{l.action}</TD>
                <TD dir="ltr" className="text-right">{l.entityType ?? '—'}</TD>
                <TD dir="ltr" className="text-right">{l.ipAddress ?? '—'}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
