import Link from 'next/link';
import { Badge, Button, Card, Table, TD, TH, THead, TR } from '@tavakoli/ui';
import { PageHeader } from '@/components/page-header';
import { AUTOMATION_STATUS_LABELS, TRIGGER_LABELS } from '@/lib/labels';
import { formatRelativeFa } from '@/lib/dates';
import { toPersianDigits } from '@/lib/dates';
import { requireUser } from '@/lib/guards';
import { clientScope } from '@/server/queries';
import { prisma } from '@tavakoli/database';

export const dynamic = 'force-dynamic';

const statusTone: Record<string, 'success' | 'neutral' | 'warning'> = {
  ACTIVE: 'success',
  DRAFT: 'neutral',
  PAUSED: 'warning',
  ARCHIVED: 'neutral',
};

export default async function AutomationsPage(): Promise<React.ReactElement> {
  const user = await requireUser();
  const scope = await clientScope(user);

  const automations = await prisma.automation.findMany({
    where: { ...scope, deletedAt: null },
    orderBy: [{ status: 'asc' }, { priority: 'desc' }],
    include: { trigger: true, client: true, instagramAccount: true },
  });

  return (
    <div>
      <PageHeader
        title="اتوماسیون‌ها"
        description="پاسخ‌های خودکار برای دایرکت و کامنت"
        action={
          user.role === 'ADMIN' ? (
            <Link href="/automations/new">
              <Button size="sm">ساخت اتوماسیون</Button>
            </Link>
          ) : null
        }
      />

      <Card className="p-2">
        {automations.length === 0 ? (
          <p className="p-6 text-center text-sm text-neutral-500">هنوز اتوماسیونی ساخته نشده است.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>نام</TH>
                <TH>مجموعه</TH>
                <TH>پیج</TH>
                <TH>محرک</TH>
                <TH>وضعیت</TH>
                <TH>اجراها</TH>
                <TH>آخرین اجرا</TH>
              </TR>
            </THead>
            <tbody>
              {automations.map((a) => (
                <TR key={a.id}>
                  <TD>
                    <Link href={`/automations/${a.id}`} className="font-medium text-brand-dark hover:underline">
                      {a.name}
                    </Link>
                  </TD>
                  <TD>{a.client.name}</TD>
                  <TD>@{a.instagramAccount.username}</TD>
                  <TD>{a.trigger ? TRIGGER_LABELS[a.trigger.type] : '—'}</TD>
                  <TD>
                    <Badge tone={statusTone[a.status]}>{AUTOMATION_STATUS_LABELS[a.status]}</Badge>
                  </TD>
                  <TD>{toPersianDigits(a.executionCount)}</TD>
                  <TD>{formatRelativeFa(a.lastExecutedAt)}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
