/**
 * Integration test for the webhook-event pipeline. Requires Postgres + Redis.
 * It probes connectivity in beforeAll and skips gracefully when infrastructure
 * is unavailable (local runs without `pnpm infra:up`); in CI the service
 * containers are present so it runs for real.
 *
 * Covers: contact creation, conversation creation, inbound message, automation
 * execution, outbound queue creation, idempotent reprocessing, and human handoff.
 */
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NormalizedInstagramEvent } from '@tavakoli/core';
import { prisma } from '@tavakoli/database';
import { connection } from '../redis';
import { processWebhookEvent } from './webhook-event';

let ready = false;
const ids = {
  client: '',
  account: '',
  automation: '',
  providerAccountId: `it-${randomUUID().slice(0, 8)}`,
};

async function seed(): Promise<void> {
  const client = await prisma.client.create({
    data: { name: 'IT Client', slug: `it-${randomUUID().slice(0, 8)}`, timeZone: 'Asia/Tehran' },
  });
  const account = await prisma.instagramAccount.create({
    data: {
      clientId: client.id,
      providerAccountId: ids.providerAccountId,
      username: 'it_account',
      status: 'CONNECTED',
      provider: 'mock',
    },
  });
  const automation = await prisma.automation.create({
    data: {
      clientId: client.id,
      instagramAccountId: account.id,
      name: 'IT price',
      status: 'ACTIVE',
      priority: 10,
      trigger: { create: { type: 'DM_KEYWORD', matchMode: 'CONTAINS', keywords: ['قیمت'] } },
      steps: {
        create: [{ order: 0, actionType: 'SEND_TEXT', config: { text: 'تعرفه ارسال شد' } }],
      },
    },
  });
  ids.client = client.id;
  ids.account = account.id;
  ids.automation = automation.id;
}

async function makeWebhookEvent(event: NormalizedInstagramEvent): Promise<string> {
  const rec = await prisma.webhookEvent.create({
    data: {
      instagramAccountId: ids.account,
      idempotencyKey: `it-${randomUUID()}`,
      eventKind: event.kind,
      rawPayload: event as unknown as object,
      signatureValid: true,
      status: 'QUEUED',
    },
  });
  return rec.id;
}

beforeAll(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await connection.ping();
    ready = true;
    await seed();
  } catch {
    ready = false;
  }
});

afterAll(async () => {
  if (ready) {
    await prisma.client.deleteMany({ where: { id: ids.client } }).catch(() => undefined);
  }
  await connection.quit().catch(() => undefined);
  await prisma.$disconnect().catch(() => undefined);
});

describe('processWebhookEvent', () => {
  it('creates contact + conversation + inbound message + outbound job for a keyword DM', async (ctx) => {
    if (!ready) return ctx.skip();

    const event: NormalizedInstagramEvent = {
      kind: 'DM',
      providerAccountId: ids.providerAccountId,
      senderScopedId: 'it-user-1',
      text: 'سلام قیمت خدمات؟',
    };
    const webhookEventId = await makeWebhookEvent(event);
    await processWebhookEvent({ webhookEventId, idempotencyKey: 'k1' });

    const contact = await prisma.contact.findUnique({
      where: {
        instagramAccountId_scopedUserId: {
          instagramAccountId: ids.account,
          scopedUserId: 'it-user-1',
        },
      },
      include: { conversations: { include: { messages: true } } },
    });
    expect(contact).not.toBeNull();
    expect(contact!.conversations).toHaveLength(1);
    expect(contact!.conversations[0]!.messages.some((m) => m.direction === 'INBOUND')).toBe(true);

    const jobs = await prisma.outboundJob.findMany({ where: { contactId: contact!.id } });
    expect(jobs.length).toBeGreaterThan(0);

    const automation = await prisma.automation.findUnique({ where: { id: ids.automation } });
    expect(automation!.executionCount).toBeGreaterThan(0);
  });

  it('is idempotent — reprocessing a PROCESSED event does nothing new', async (ctx) => {
    if (!ready) return ctx.skip();

    const event: NormalizedInstagramEvent = {
      kind: 'DM',
      providerAccountId: ids.providerAccountId,
      senderScopedId: 'it-user-2',
      text: 'قیمت',
    };
    const webhookEventId = await makeWebhookEvent(event);
    await processWebhookEvent({ webhookEventId, idempotencyKey: 'k2' });
    const before = await prisma.message.count();
    await processWebhookEvent({ webhookEventId, idempotencyKey: 'k2' });
    const after = await prisma.message.count();
    expect(after).toBe(before);
  });

  it('hands off to a human when no automation matches', async (ctx) => {
    if (!ready) return ctx.skip();

    const event: NormalizedInstagramEvent = {
      kind: 'DM',
      providerAccountId: ids.providerAccountId,
      senderScopedId: 'it-user-3',
      text: 'سلام خوبی؟',
    };
    const webhookEventId = await makeWebhookEvent(event);
    await processWebhookEvent({ webhookEventId, idempotencyKey: 'k3' });

    const contact = await prisma.contact.findUnique({
      where: {
        instagramAccountId_scopedUserId: {
          instagramAccountId: ids.account,
          scopedUserId: 'it-user-3',
        },
      },
      include: { conversations: true },
    });
    expect(contact!.conversations[0]!.needsHuman).toBe(true);
  });
});
