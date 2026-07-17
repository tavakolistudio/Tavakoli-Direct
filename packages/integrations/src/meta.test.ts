import { describe, expect, it } from 'vitest';
import { MetaInstagramProvider } from './meta';

const provider = new MetaInstagramProvider();

describe('MetaInstagramProvider.parseWebhook', () => {
  it('normalizes an Instagram DM webhook', async () => {
    const events = await provider.parseWebhook({
      object: 'instagram',
      entry: [
        {
          id: 'acc-123',
          messaging: [
            {
              sender: { id: 'user-9' },
              recipient: { id: 'acc-123' },
              timestamp: 1700000000000,
              message: { mid: 'mid-1', text: 'سلام قیمت' },
            },
          ],
        },
      ],
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: 'DM',
      providerAccountId: 'acc-123',
      senderScopedId: 'user-9',
      text: 'سلام قیمت',
      providerMessageId: 'mid-1',
    });
  });

  it('normalizes a comment webhook', async () => {
    const events = await provider.parseWebhook({
      object: 'instagram',
      entry: [
        {
          id: 'acc-123',
          changes: [
            {
              field: 'comments',
              value: {
                id: 'comment-1',
                text: 'قیمت؟',
                media: { id: 'media-7' },
                from: { id: 'user-2', username: 'ali' },
              },
            },
          ],
        },
      ],
    });
    expect(events[0]).toMatchObject({
      kind: 'COMMENT',
      commentId: 'comment-1',
      mediaId: 'media-7',
      senderUsername: 'ali',
    });
  });

  it('ignores echo messages', async () => {
    const events = await provider.parseWebhook({
      object: 'instagram',
      entry: [{ id: 'a', messaging: [{ message: { is_echo: true, text: 'x' } }] }],
    });
    expect(events).toHaveLength(0);
  });
});
