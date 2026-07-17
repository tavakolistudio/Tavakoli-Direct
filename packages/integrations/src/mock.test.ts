import { describe, expect, it } from 'vitest';
import { MockInstagramProvider } from './mock';

const provider = new MockInstagramProvider();

describe('MockInstagramProvider', () => {
  it('reports storyReply as unavailable and quickReplies as available', async () => {
    const caps = await provider.getCapabilities();
    expect(caps.storyReply).toBe(false);
    expect(caps.quickReplies).toBe(true);
  });

  it('treats mock webhooks as verified', async () => {
    expect(await provider.verifyWebhook({ rawBody: '{}', signature: null })).toBe(true);
  });

  it('parses a mock DM payload into a normalized event', async () => {
    const events = await provider.parseWebhook({
      provider: 'mock',
      events: [{ kind: 'DM', providerAccountId: 'acc1', senderScopedId: 'u1', text: 'قیمت' }],
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe('DM');
    expect(events[0]?.text).toBe('قیمت');
  });

  it('returns a synthetic provider message id on success', async () => {
    const r = await provider.sendText({ providerAccountId: 'a', recipientScopedId: 'u1', text: 'hi' });
    expect(r.success).toBe(true);
    expect(r.providerMessageId).toMatch(/^mock-msg-/);
  });

  it('simulates a rate-limit error via marker', async () => {
    const r = await provider.sendText({
      providerAccountId: 'a',
      recipientScopedId: 'u1::fail-rate-limit',
      text: 'hi',
    });
    expect(r.success).toBe(false);
    expect(r.error?.code).toBe(4);
  });

  it('simulates a token-expired error via marker', async () => {
    const r = await provider.sendText({
      providerAccountId: 'a',
      recipientScopedId: 'u1::fail-token',
      text: 'hi',
    });
    expect(r.error?.code).toBe(190);
  });
});
