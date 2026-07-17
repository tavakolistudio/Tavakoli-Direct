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
});
