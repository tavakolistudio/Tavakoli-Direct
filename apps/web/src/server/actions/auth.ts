'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { LOGIN_RATE_LIMIT } from '@tavakoli/config';
import { prisma } from '@tavakoli/database';
import { audit } from '@/lib/audit';
import { verifyPassword } from '@/lib/password';
import { clearRateLimit, rateLimit } from '@/lib/rate-limit';
import { createSession, destroySession } from '@/lib/session';

const loginSchema = z.object({
  email: z.string().email('ایمیل معتبر وارد کنید.'),
  password: z.string().min(1, 'رمز عبور را وارد کنید.'),
});

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'اطلاعات واردشده معتبر نیست.' };
  }
  const { email, password } = parsed.data;

  const hdrs = await headers();
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const userAgent = hdrs.get('user-agent') ?? undefined;

  // Rate-limit by IP + email to slow credential stuffing.
  const limit = await rateLimit(
    `login:${ip}:${email.toLowerCase()}`,
    LOGIN_RATE_LIMIT.maxAttempts,
    LOGIN_RATE_LIMIT.windowSeconds,
  );
  if (!limit.allowed) {
    return { error: 'تعداد تلاش‌های ناموفق زیاد است. لطفاً کمی بعد دوباره تلاش کنید.' };
  }

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), isActive: true, deletedAt: null },
  });

  // Constant-ish work regardless of user existence; generic error message.
  const ok = user ? await verifyPassword(user.passwordHash, password) : false;
  if (!user || !ok) {
    await audit({ action: 'LOGIN_FAILED', metadata: { email }, ipAddress: ip });
    return { error: 'ایمیل یا رمز عبور نادرست است.' };
  }

  await clearRateLimit(`login:${ip}:${email.toLowerCase()}`);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user, { ip, userAgent });
  await audit({ actorId: user.id, action: 'LOGIN', ipAddress: ip });

  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/login');
}
