import 'server-only';
import { webhookIdempotencyKey, type NormalizedInstagramEvent } from '@tavakoli/core';
import { Prisma, prisma } from '@tavakoli/database';
import { getProvider } from '@tavakoli/integrations';
import { enqueueWebhookEvent } from '@/lib/queue';

export interface IngestResult {
  received: number;
  duplicates: number;
  queued: number;
}

/**
 * Persist raw normalized events (idempotently) and enqueue them for async
 * processing. The webhook endpoint returns quickly; automation runs in the worker.
 */
export async function ingestEvents(
  events: NormalizedInstagramEvent[],
  signatureValid: boolean,
): Promise<IngestResult> {
  let duplicates = 0;
  let queued = 0;

  for (const event of events) {
    const idempotencyKey = webhookIdempotencyKey(event);

    // Resolve the internal account id (if known) for scoping.
    const account = await prisma.instagramAccount.findUnique({
      where: { providerAccountId: event.providerAccountId },
      select: { id: true },
    });

    try {
      const record = await prisma.webhookEvent.create({
        data: {
          instagramAccountId: account?.id ?? null,
          idempotencyKey,
          eventKind: event.kind,
          // Store the normalized event (it embeds the provider raw payload) so the
          // worker can reprocess without re-parsing provider-specific shapes.
          rawPayload: event as unknown as Prisma.InputJsonValue,
          signatureValid,
          status: 'QUEUED',
        },
      });
      await enqueueWebhookEvent({ webhookEventId: record.id, idempotencyKey });
      queued += 1;
    } catch (err) {
      // Unique-constraint violation on idempotencyKey → already seen.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        duplicates += 1;
        continue;
      }
      throw err;
    }
  }

  return { received: events.length, duplicates, queued };
}

/** Verify signature + parse a raw request body into normalized events. */
export async function verifyAndParse(
  rawBody: string,
  signatureHeader: string | null,
): Promise<{ signatureValid: boolean; events: NormalizedInstagramEvent[] }> {
  const provider = getProvider();
  const signatureValid = await provider.verifyWebhook({ rawBody, signature: signatureHeader });
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { signatureValid, events: [] };
  }
  const events = await provider.parseWebhook(payload);
  return { signatureValid, events };
}
