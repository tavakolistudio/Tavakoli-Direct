import Link from 'next/link';

export default function NotFound(): React.ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold text-neutral-900">صفحه یافت نشد</h1>
      <p className="text-sm text-neutral-500">آدرس موردنظر وجود ندارد یا دسترسی ندارید.</p>
      <Link href="/dashboard" className="text-brand-dark hover:underline">
        بازگشت به داشبورد
      </Link>
    </main>
  );
}
