import { Card, CardContent, CardHeader, CardTitle } from '@tavakoli/ui';
import { PageHeader } from '@/components/page-header';
import { requireAdmin } from '@/lib/guards';
import { ClientForm } from './client-form';

export const dynamic = 'force-dynamic';

export default async function NewClientPage(): Promise<React.ReactElement> {
  await requireAdmin();
  return (
    <div>
      <PageHeader title="افزودن مجموعه" description="یک مشتری جدید ثبت کنید" />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>اطلاعات مجموعه</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm />
        </CardContent>
      </Card>
    </div>
  );
}
