import { describe, expect, it } from 'vitest';
import { resolveConflict, type Candidate } from './priority';

function c(over: Partial<Candidate>): Candidate {
  return {
    automationId: 'a',
    isActive: true,
    triggerType: 'DM_KEYWORD',
    priority: 0,
    specificity: 1,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...over,
  };
}

describe('resolveConflict', () => {
  it('returns null winner when all candidates are inactive', () => {
    const res = resolveConflict([c({ isActive: false })]);
    expect(res.winner).toBeNull();
  });

  it('prefers keyword triggers over outside-business-hours', () => {
    const kw = c({ automationId: 'kw', triggerType: 'DM_KEYWORD' });
    const bh = c({ automationId: 'bh', triggerType: 'OUTSIDE_BUSINESS_HOURS' });
    expect(resolveConflict([bh, kw]).winner?.automationId).toBe('kw');
  });

  it('uses explicit priority as a tie-breaker', () => {
    const low = c({ automationId: 'low', priority: 1 });
    const high = c({ automationId: 'high', priority: 5 });
    expect(resolveConflict([low, high]).winner?.automationId).toBe('high');
  });

  it('uses specificity before creation date', () => {
    const broad = c({ automationId: 'broad', specificity: 1 });
    const specific = c({ automationId: 'specific', specificity: 3 });
    expect(resolveConflict([broad, specific]).winner?.automationId).toBe('specific');
  });

  it('falls back to earliest creation date', () => {
    const older = c({ automationId: 'older', createdAt: new Date('2024-01-01T00:00:00Z') });
    const newer = c({ automationId: 'newer', createdAt: new Date('2024-06-01T00:00:00Z') });
    expect(resolveConflict([newer, older]).winner?.automationId).toBe('older');
  });

  it('records skipped candidates with reasons', () => {
    const kw = c({ automationId: 'kw', triggerType: 'DM_KEYWORD' });
    const bh = c({ automationId: 'bh', triggerType: 'OUTSIDE_BUSINESS_HOURS' });
    const res = resolveConflict([kw, bh]);
    expect(res.skipped).toHaveLength(1);
    expect(res.skipped[0]?.candidate.automationId).toBe('bh');
  });
});
