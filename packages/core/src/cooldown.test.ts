import { describe, expect, it } from 'vitest';
import { checkCooldown, checkMaxExecutions } from './cooldown';

describe('checkCooldown', () => {
  const now = new Date('2024-01-01T12:00:00Z');

  it('allows when never fired', () => {
    expect(checkCooldown({ cooldownSeconds: 3600, lastFiredAt: null, now }).allowed).toBe(true);
  });

  it('allows when cooldown disabled', () => {
    const last = new Date('2024-01-01T11:59:59Z');
    expect(checkCooldown({ cooldownSeconds: 0, lastFiredAt: last, now }).allowed).toBe(true);
  });

  it('blocks within the cooldown window and reports retry-after', () => {
    const last = new Date('2024-01-01T11:30:00Z'); // 30 min ago
    const r = checkCooldown({ cooldownSeconds: 3600, lastFiredAt: last, now });
    expect(r.allowed).toBe(false);
    expect(r.retryAfterSeconds).toBe(1800);
  });

  it('allows once the window has elapsed', () => {
    const last = new Date('2024-01-01T10:59:59Z'); // just over 1h ago
    expect(checkCooldown({ cooldownSeconds: 3600, lastFiredAt: last, now }).allowed).toBe(true);
  });
});

describe('checkMaxExecutions', () => {
  it('is unlimited when max is null or 0', () => {
    expect(checkMaxExecutions(100, null).allowed).toBe(true);
    expect(checkMaxExecutions(100, 0).allowed).toBe(true);
  });
  it('allows below the limit and blocks at the limit', () => {
    expect(checkMaxExecutions(2, 3).allowed).toBe(true);
    expect(checkMaxExecutions(3, 3).allowed).toBe(false);
  });
});
