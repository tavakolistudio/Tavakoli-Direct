import { describe, expect, it } from 'vitest';
import { evaluate, type AutomationDef, type EvaluationContext } from './engine';
import type { NormalizedInstagramEvent } from './types';

function dmEvent(text: string): NormalizedInstagramEvent {
  return { kind: 'DM', providerAccountId: 'acc1', senderScopedId: 'u1', text };
}

const priceAutomation: AutomationDef = {
  automationId: 'price',
  name: 'قیمت',
  isActive: true,
  priority: 10,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  trigger: {
    triggerType: 'DM_KEYWORD',
    keywordRule: { mode: 'CONTAINS', keywords: ['قیمت', 'هزینه', 'تعرفه'] },
  },
  cooldownSeconds: 0,
  maxExecutionsPerContact: null,
};

const fallback: AutomationDef = {
  automationId: 'fallback',
  name: 'ارجاع به انسان',
  isActive: true,
  priority: 0,
  createdAt: new Date('2024-01-02T00:00:00Z'),
  trigger: { triggerType: 'NO_RULE_MATCHED' },
  cooldownSeconds: 0,
  maxExecutionsPerContact: null,
};

const emptyCtx: EvaluationContext = { lastFiredAt: {}, executionCount: {} };

describe('evaluate', () => {
  it('selects the keyword automation for a matching DM', () => {
    const res = evaluate(dmEvent('سلام قیمت خدمات چقدره؟'), [priceAutomation, fallback], emptyCtx);
    expect(res.winner?.automationId).toBe('price');
    expect(res.matchedKeyword).toBe('قیمت');
    expect(res.blocked).toBe(false);
  });

  it('falls back to NO_RULE_MATCHED when nothing else matches', () => {
    const res = evaluate(dmEvent('سلام خوبی؟'), [priceAutomation, fallback], emptyCtx);
    expect(res.winner?.automationId).toBe('fallback');
  });

  it('blocks the winner when within cooldown', () => {
    const now = new Date('2024-01-01T12:00:00Z');
    const cooled: AutomationDef = { ...priceAutomation, cooldownSeconds: 3600 };
    const res = evaluate(dmEvent('قیمت'), [cooled], {
      now,
      lastFiredAt: { price: new Date('2024-01-01T11:30:00Z') },
      executionCount: {},
    });
    expect(res.winner?.automationId).toBe('price');
    expect(res.blocked).toBe(true);
    expect(res.blockedReason).toContain('cooldown');
  });

  it('does not match a paused (inactive) automation', () => {
    const paused = { ...priceAutomation, isActive: false };
    const res = evaluate(dmEvent('قیمت'), [paused], emptyCtx);
    expect(res.winner).toBeNull();
  });

  it('skips story-reply triggers when the capability is unavailable', () => {
    const story: AutomationDef = {
      ...priceAutomation,
      automationId: 'story',
      trigger: {
        triggerType: 'STORY_REPLY_KEYWORD',
        keywordRule: { mode: 'CONTAINS', keywords: ['قیمت'] },
        capabilityAvailable: false,
      },
    };
    const event: NormalizedInstagramEvent = {
      kind: 'STORY_REPLY',
      providerAccountId: 'acc1',
      senderScopedId: 'u1',
      text: 'قیمت',
    };
    const res = evaluate(event, [story], emptyCtx);
    expect(res.winner).toBeNull();
  });

  it('matches any comment on the locked post when matchAnyComment is set', () => {
    const anyComment: AutomationDef = {
      automationId: 'anycomment',
      name: 'هر کامنت',
      isActive: true,
      priority: 0,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      trigger: { triggerType: 'COMMENT_KEYWORD', mediaId: 'post123', matchAnyComment: true },
      cooldownSeconds: 0,
      maxExecutionsPerContact: null,
    };
    const comment = (text: string, mediaId: string): NormalizedInstagramEvent => ({
      kind: 'COMMENT',
      providerAccountId: 'acc1',
      senderScopedId: 'u1',
      text,
      mediaId,
      commentId: 'c1',
    });

    // Any text matches on the right post — even with no keyword.
    expect(evaluate(comment('👍', 'post123'), [anyComment], emptyCtx).winner?.automationId).toBe(
      'anycomment',
    );
    // A comment on a different post is still ignored.
    expect(evaluate(comment('سلام', 'other'), [anyComment], emptyCtx).winner).toBeNull();
  });

  it('prefers a keyword comment rule over any-comment on the same post', () => {
    const base = {
      isActive: true,
      priority: 0,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      cooldownSeconds: 0,
      maxExecutionsPerContact: null,
    };
    const anyComment: AutomationDef = {
      ...base,
      automationId: 'any',
      name: 'هر کامنت',
      trigger: { triggerType: 'COMMENT_KEYWORD', mediaId: 'post123', matchAnyComment: true },
    };
    const keyword: AutomationDef = {
      ...base,
      automationId: 'kw',
      name: 'کلیدواژه',
      trigger: {
        triggerType: 'COMMENT_KEYWORD',
        mediaId: 'post123',
        keywordRule: { mode: 'CONTAINS', keywords: ['قیمت'] },
      },
    };
    const event: NormalizedInstagramEvent = {
      kind: 'COMMENT',
      providerAccountId: 'acc1',
      senderScopedId: 'u1',
      text: 'قیمت چنده؟',
      mediaId: 'post123',
      commentId: 'c1',
    };
    expect(evaluate(event, [anyComment, keyword], emptyCtx).winner?.automationId).toBe('kw');
  });
});
