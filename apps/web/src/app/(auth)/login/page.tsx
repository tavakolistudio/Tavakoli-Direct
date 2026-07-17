import { redirect } from 'next/navigation';
import { APP_NAME, APP_TAGLINE_FA } from '@tavakoli/config';
import { getSessionUser } from '@/lib/session';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export default async function LoginPage(): Promise<React.ReactElement> {
  const user = await getSessionUser();
  if (user) redirect('/dashboard');

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">
            TD
          </div>
          <h1 className="text-xl font-bold text-neutral-900">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-neutral-500">{APP_TAGLINE_FA}</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-neutral-400">
          دسترسی فقط برای اعضای تیم Tavakoli Studio
        </p>
      </div>
    </main>
  );
}
