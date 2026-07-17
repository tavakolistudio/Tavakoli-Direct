import { toCsv, LEAD_STATUSES } from '@tavakoli/core';
import { prisma, type Prisma } from '@tavakoli/database';
import { audit } from '@/lib/audit';
import { requireUser } from '@/lib/guards';
import { clientScope } from '@/server/queries';
import { formatDateTimeFa } from '@/lib/dates';
import { LEAD_STATUS_LABELS } from '@/lib/labels';

export const dynamic = 'force-dynamic';

/**
 * CSV export of contacts (CSV-injection-safe via toCsv). Respects operator
 * client access and the optional `q` search filter. Audit-logged.
 */
export async function GET(request: Request): Promise<Response> {
  const user = await requireUser();
  const scope = await clientScope(user);
  const q = new URL(request.url).searchParams.get('q') ?? undefined;

  const where: Prisma.ContactWhereInput = {
    ...scope,
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { displayName: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q } },
          ],
        }
      : {}),
  };

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { lastInteractionAt: 'desc' },
    include: { lead: true, client: true },
  });

  const headers = ['username', 'displayName', 'phone', 'email', 'client', 'leadStatus', 'firstInteraction', 'lastInteraction'];
  const rows = contacts.map((c) => ({
    username: c.username ?? '',
    displayName: c.displayName ?? '',
    phone: c.phone ?? '',
    email: c.email ?? '',
    client: c.client.name,
    leadStatus: c.lead && LEAD_STATUSES.includes(c.lead.status) ? LEAD_STATUS_LABELS[c.lead.status] : '',
    firstInteraction: formatDateTimeFa(c.firstInteractionAt),
    lastInteraction: formatDateTimeFa(c.lastInteractionAt),
  }));

  const csv = '﻿' + toCsv(rows, headers); // BOM for Excel UTF-8

  await audit({
    actorId: user.id,
    action: 'CONTACT_EXPORT',
    metadata: { count: contacts.length },
  });

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="contacts-${Date.now()}.csv"`,
    },
  });
}
