import 'server-only';
import { prisma } from '@tavakoli/database';
import { accessibleClientIds } from '@/lib/guards';
import type { SessionUser } from '@/lib/session';

/** Build a Prisma `clientId` filter honoring operator access (admins: no filter). */
export async function clientScope(user: SessionUser): Promise<{ clientId?: { in: string[] } }> {
  const ids = await accessibleClientIds(user);
  return ids ? { clientId: { in: ids } } : {};
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export interface DashboardStats {
  connectedAccounts: number;
  incomingToday: number;
  autoRepliesToday: number;
  commentRepliesToday: number;
  leadsToday: number;
  needsHuman: number;
  webhookErrors: number;
}

export async function getDashboardStats(user: SessionUser): Promise<DashboardStats> {
  const scope = await clientScope(user);
  const since = startOfToday();
  const convScope = Object.keys(scope).length ? { conversation: scope } : {};

  const [
    connectedAccounts,
    incomingToday,
    autoRepliesToday,
    commentRepliesToday,
    leadsToday,
    needsHuman,
    webhookErrors,
  ] = await Promise.all([
    prisma.instagramAccount.count({ where: { ...scope, status: 'CONNECTED', deletedAt: null } }),
    prisma.message.count({
      where: { direction: 'INBOUND', createdAt: { gte: since }, ...convScope },
    }),
    prisma.message.count({
      where: {
        direction: 'OUTBOUND',
        senderType: 'AUTOMATION',
        createdAt: { gte: since },
        ...convScope,
      },
    }),
    prisma.message.count({
      where: { type: 'STORY_REPLY', createdAt: { gte: since }, ...convScope },
    }),
    prisma.contact.count({ where: { ...scope, firstInteractionAt: { gte: since } } }),
    prisma.conversation.count({
      where: { ...scope, needsHuman: true, status: { not: 'RESOLVED' } },
    }),
    prisma.webhookEvent.count({ where: { status: 'FAILED' } }),
  ]);

  return {
    connectedAccounts,
    incomingToday,
    autoRepliesToday,
    commentRepliesToday,
    leadsToday,
    needsHuman,
    webhookErrors,
  };
}
