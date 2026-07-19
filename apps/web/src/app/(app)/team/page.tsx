import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TD,
  TH,
  THead,
  TR,
} from '@tavakoli/ui';
import { PageHeader } from '@/components/page-header';
import { ROLE_LABELS } from '@/lib/labels';
import { formatRelativeFa } from '@/lib/dates';
import { requireAdmin } from '@/lib/guards';
import { prisma } from '@tavakoli/database';
import { CreateOperatorForm } from './create-operator-form';
import { MemberActions } from './member-actions';

export const dynamic = 'force-dynamic';

export default async function TeamPage(): Promise<React.ReactElement> {
  const admin = await requireAdmin();
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <PageHeader title="اعضای تیم" description="مدیریت مدیران و اپراتورها" />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>ایجاد کاربر جدید</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateOperatorForm />
        </CardContent>
      </Card>

      <Card className="p-2">
        <Table>
          <THead>
            <TR>
              <TH>نام</TH>
              <TH>ایمیل</TH>
              <TH>نقش</TH>
              <TH>وضعیت</TH>
              <TH>آخرین ورود</TH>
              <TH>عملیات</TH>
            </TR>
          </THead>
          <tbody>
            {users.map((u) => (
              <TR key={u.id}>
                <TD>{u.name}</TD>
                <TD dir="ltr" className="text-right">
                  {u.email}
                </TD>
                <TD>
                  <Badge tone={u.role === 'ADMIN' ? 'brand' : 'neutral'}>
                    {ROLE_LABELS[u.role]}
                  </Badge>
                </TD>
                <TD>
                  {u.isActive ? (
                    <Badge tone="success">فعال</Badge>
                  ) : (
                    <Badge tone="danger">غیرفعال</Badge>
                  )}
                </TD>
                <TD>{formatRelativeFa(u.lastLoginAt)}</TD>
                <TD>
                  <MemberActions
                    userId={u.id}
                    name={u.name}
                    isActive={u.isActive}
                    isSelf={u.id === admin.id}
                  />
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
