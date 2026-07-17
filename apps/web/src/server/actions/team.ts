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
