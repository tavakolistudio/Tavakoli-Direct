'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { defaultBusinessHours } from '@tavakoli/core';
import { prisma } from '@tavakoli/database';
import { audit } from '@/lib/audit';
import { requireAdmin } from '@/lib/guards';

const clientSchema = z.object({
  name: z.string().min(2, 'نام مجموعه را وارد کنید.'),
  description: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  website: z.string().url('آدرس وب‌سایت معتبر نیست.').optional().or(z.literal('')),
  timeZone: z.string().default('Asia/Tehran'),
});

function slugify(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `client-${Date.now()}`;
}

export interface ClientFormState {
  error?: string;
}

export async function createClientAction(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const admin = await requireAdmin();
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'اطلاعات واردشده معتبر نیست.' };
  }
  const data = parsed.data;

  let slug = slugify(data.name);
  if (await prisma.client.findUnique({ where: { slug } })) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const client = await prisma.client.create({
    data: {
      name: data.name,
      slug,
      description: data.description || null,
      phone: data.phone || null,
      whatsapp: data.whatsapp || null,
      website: data.website || null,
      timeZone: data.timeZone,
      businessHours: defaultBusinessHours(data.timeZone) as object,
    },
  });

  await audit({
    actorId: admin.id,
    action: 'CLIENT_CREATE',
    entityType: 'Client',
    entityId: client.id,
  });
  revalidatePath('/clients');
  redirect(`/clients/${client.id}`);
}

export async function toggleClientActiveAction(clientId: string, isActive: boolean): Promise<void> {
  const admin = await requireAdmin();
  await prisma.client.update({ where: { id: clientId }, data: { isActive } });
  await audit({
    actorId: admin.id,
    action: isActive ? 'CLIENT_ACTIVATE' : 'CLIENT_DEACTIVATE',
    entityType: 'Client',
    entityId: clientId,
  });
  revalidatePath('/clients');
}

const updateSchema = clientSchema.extend({ clientId: z.string().min(1) });

/**
 * Edits a client's profile. The slug is left alone on purpose — it is a stable
 * identifier, and renaming a business should not silently change its URLs.
 */
export async function updateClientAction(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const admin = await requireAdmin();
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'اطلاعات نامعتبر است.' };
  const d = parsed.data;

  const existing = await prisma.client.findFirst({
    where: { id: d.clientId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { error: 'مجموعه یافت نشد.' };

  await prisma.client.update({
    where: { id: d.clientId },
    data: {
      name: d.name,
      description: d.description?.trim() || null,
      phone: d.phone?.trim() || null,
      whatsapp: d.whatsapp?.trim() || null,
      website: d.website?.trim() || null,
      timeZone: d.timeZone,
    },
  });

  await audit({
    actorId: admin.id,
    action: 'CLIENT_UPDATE',
    entityType: 'Client',
    entityId: d.clientId,
  });

  revalidatePath('/clients');
  revalidatePath(`/clients/${d.clientId}`);
  redirect(`/clients/${d.clientId}`);
}
