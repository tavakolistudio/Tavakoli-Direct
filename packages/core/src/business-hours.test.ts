import { describe, expect, it } from 'vitest';
import {
  defaultBusinessHours,
  isOutsideBusinessHours,
  isWithinBusinessHours,
} from './business-hours';

describe('business hours (Asia/Tehran)', () => {
  const schedule = defaultBusinessHours('Asia/Tehran');

  it('is within hours on a Sunday at noon Tehran time', () => {
    // 2024-01-07 is a Sunday. 09:00 UTC ≈ 12:30 Tehran (UTC+3:30).
    const at = new Date('2024-01-07T09:00:00Z');
    expect(isWithinBusinessHours(schedule, at)).toBe(true);
  });

  it('is outside hours late at night Tehran time', () => {
    // 2024-01-07 22:00 UTC ≈ 01:30 Tehran next day → closed.
    const at = new Date('2024-01-07T22:00:00Z');
    expect(isOutsideBusinessHours(schedule, at)).toBe(true);
  });

  it('is closed on Friday', () => {
    // 2024-01-05 is a Friday. Midday Tehran → closed.
    const at = new Date('2024-01-05T09:00:00Z');
    expect(isWithinBusinessHours(schedule, at)).toBe(false);
  });
});
