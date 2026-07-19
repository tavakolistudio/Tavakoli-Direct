'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@tavakoli/database';
import { audit } from '@/lib/audit';
import { requireAdmin } from '@/lib/guards';
import { hashPassword } from '@/lib/password';

const createSchema = z.object({
  name: z.string().min(2, 'نام را وارد کنید.'),
  email: z.string().email('ایمیل معتبر وارد کنید.'),
  password: z.string().min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد.'),
  role: z.enum(['ADMIN', 'OPERATOR']).default('OPERATOR'),
});

export interface TeamFormState {
  error?: string;
  ok?: boolean;
}

export async function createOperatorAction(
  _prev: TeamFormState,
  formData: FormData,
): Promise<TeamFormState> {
  const admin = await requireAdmin();
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'اطلاعات نامعتبر است.' };
  const d = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: d.email.toLowerCase() } });
  if (existing) return { error: 'کاربری با این ایمیل از قبل وجود دارد.' };

  const user = await prisma.user.create({
    data: {
      name: d.name,
      email: d.email.toLowerCase(),
      role: d.role,
      passwordHash: await hashPassword(d.password),
    },
  });
  await audit({
    actorId: admin.id,
    action: 'OPERATOR_CREATE',
    entityType: 'User',
    entityId: user.id,
    metadata: { role: d.role },
  });
  revalidatePath('/team');
  return { ok: true };
}

export async function toggleUserActiveAction(userId: string, isActive: boolean): Promise<void> {
  const admin = await requireAdmin();
  if (userId === admin.id) return; // never deactivate yourself
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  await audit({
    actorId: admin.id,
    action: isActive ? 'OPERATOR_ACTIVATE' : 'OPERATOR_DEACTIVATE',
    entityType: 'User',
    entityId: userId,
  });
  revalidatePath('/team');
}

/**
 * Soft-deletes a team member and kills their sessions.
 *
 * Two guards matter here: you cannot remove yourself, and you cannot remove the
 * last active admin — either would leave the panel unusable with no way back in.
 */
export async function deleteUserAction(userId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (userId === admin.id) return { ok: false, error: 'نمی‌توانید حساب خودتان را حذف کنید.' };

  const target = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!target) return { ok: false, error: 'کاربر یافت نشد.' };

  if (target.role === 'ADMIN') {
    const remainingAdmins = await prisma.user.count({
      where: { role: 'ADMIN', isActive: true, deletedAt: null, id: { not: userId } },
    });
    if (remainingAdmins === 0) {
      return { ok: false, error: 'آخرین مدیر سیستم را نمی‌توان حذف کرد.' };
    }
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { isActive: false, deletedAt: new Date() },
    }),
    // Revoke access immediately rather than waiting for the token to expire.
    prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await audit({
    actorId: admin.id,
    action: 'OPERATOR_DELETE',
    entityType: 'User',
    entityId: userId,
    metadata: { email: target.email, role: target.role },
  });
  revalidatePath('/team');
  return { ok: true };
}
