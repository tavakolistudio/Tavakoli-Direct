'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { LOGIN_RATE_LIMIT, SESSION_COOKIE } from '@tavakoli/config';
import { prisma } from '@tavakoli/database';
import { audit } from '@/lib/audit';
import { hashPassword, verifyPassword } from '@/lib/password';
import { clearRateLimit, rateLimit } from '@/lib/rate-limit';
import { createSession, destroySession, tokenHash as sessionTokenHash } from '@/lib/session';
import { requireUser } from '@/lib/guards';

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

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'رمز فعلی را وارد کنید.'),
  newPassword: z.string().min(8, 'رمز جدید باید حداقل ۸ کاراکتر باشد.'),
  confirmPassword: z.string(),
});

export interface ChangePasswordState {
  error?: string;
  ok?: boolean;
}

/**
 * Changes the signed-in user's password. All OTHER sessions are revoked — a
 * password change usually means "I suspect someone else has access", so leaving
 * their sessions alive would defeat the point. The current session stays.
 */
export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'اطلاعات نامعتبر است.' };
  const d = parsed.data;

  if (d.newPassword !== d.confirmPassword) {
    return { error: 'تکرار رمز جدید یکسان نیست.' };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!dbUser) return { error: 'کاربر یافت نشد.' };

  const valid = await verifyPassword(dbUser.passwordHash, d.currentPassword);
  if (!valid) return { error: 'رمز فعلی اشتباه است.' };

  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value ?? '';

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(d.newPassword) },
    }),
    prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null, NOT: { tokenHash: sessionTokenHash(token) } },
      data: { revokedAt: new Date() },
    }),
  ]);

  await audit({
    actorId: user.id,
    action: 'PASSWORD_CHANGE',
    entityType: 'User',
    entityId: user.id,
  });
  return { ok: true };
}
