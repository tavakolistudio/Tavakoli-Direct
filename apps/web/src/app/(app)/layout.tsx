import { Sidebar } from '@/components/sidebar';
import { requireUser } from '@/lib/guards';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar role={user.role} userName={user.name} />
      <main className="flex-1 overflow-x-hidden px-4 py-6 md:px-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
