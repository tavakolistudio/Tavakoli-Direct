import { describe, expect, it } from 'vitest';
import { MockAiReplyProvider } from './ai';

describe('MockAiReplyProvider', () => {
  const provider = new MockAiReplyProvider();

  it('drafts a reply that references the knowledge and the commenter', async () => {
    const result = await provider.generateReply({
      knowledge: 'تعرفه عکاسی پرتره از ۵۰۰ هزار تومان شروع می‌شود.',
      commentText: 'قیمت عکاسی چنده؟',
      contactUsername: 'ali',
    });
    expect(result.success).toBe(true);
    expect(result.text).toContain('@ali');
    expect(result.text).toContain('تعرفه عکاسی');
  });

  it('fails when the knowledge base is empty', async () => {
    const result = await provider.generateReply({ knowledge: '   ', commentText: 'سلام' });
    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('empty knowledge base');
  });
});
