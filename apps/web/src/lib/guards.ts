import 'server-only';
import { redirect } from 'next/navigation';
import { AppError } from '@tavakoli/core';
import { prisma } from '@tavakoli/database';
import { getSessionUser, type SessionUser } from './session';

/** Require any authenticated user; redirect to /login otherwise. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

/** Require an ADMIN; operators are redirected to the dashboard. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'ADMIN') redirect('/dashboard');
  return user;
}

/** Assert (server-side) that the user may access a given client. */
export async function assertClientAccess(user: SessionUser, clientId: string): Promise<void> {
  if (user.role === 'ADMIN') return;
  const access = await prisma.clientUserAccess.findUnique({
    where: { clientId_userId: { clientId, userId: user.id } },
  });
  if (!access) throw new AppError('AUTHORIZATION');
}

/** The set of client ids an operator may see (admins: undefined = all). */
export async function accessibleClientIds(user: SessionUser): Promise<string[] | undefined> {
  if (user.role === 'ADMIN') return undefined;
  const rows = await prisma.clientUserAccess.findMany({
    where: { userId: user.id },
    select: { clientId: true },
  });
  return rows.map((r) => r.clientId);
}
