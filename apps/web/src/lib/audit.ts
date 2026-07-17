import 'server-only';
import { prisma } from '@tavakoli/database';

/**
 * Append an audit log entry. Never store secrets or full tokens — callers pass
 * only safe metadata.
 */
export async function audit(entry: {
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}): Promise<void> {
  await prisma.auditLog
    .create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata ? (entry.metadata as object) : undefined,
        ipAddress: entry.ipAddress ?? null,
      },
    })
    .catch(() => undefined); // auditing must never break the main flow
}
