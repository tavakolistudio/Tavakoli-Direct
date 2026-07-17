/**
 * Maintenance: enforce the webhook payload retention policy by deleting raw
 * payloads older than the configured retention window.
 */
import { env } from '@tavakoli/config';
import { prisma } from '@tavakoli/database';
import { log } from '../log';

export async function runMaintenance(): Promise<void> {
  const cutoff = new Date(Date.now() - env.WEBHOOK_PAYLOAD_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const result = await prisma.webhookEvent.deleteMany({
    where: { createdAt: { lt: cutoff }, status: { in: ['PROCESSED', 'DUPLICATE'] } },
  });
  log.info('maintenance: webhook retention cleanup', {
    deleted: result.count,
    cutoff: cutoff.toISOString(),
  });
}
