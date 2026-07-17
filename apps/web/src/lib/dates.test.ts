import { describe, expect, it } from 'vitest';
import { formatDateFa, toPersianDigits } from './dates';

describe('toPersianDigits', () => {
  it('converts Latin digits to Persian', () => {
    expect(toPersianDigits(1402)).toBe('۱۴۰۲');
    expect(toPersianDigits('09123')).toBe('۰۹۱۲۳');
  });
});

describe('formatDateFa', () => {
  it('renders a placeholder for empty values', () => {
    expect(formatDateFa(null)).toBe('—');
  });
  it('formats a date using the Persian calendar', () => {
    const s = formatDateFa(new Date('2024-03-20T00:00:00Z'));
    // Uses Persian digits — should contain at least one.
    expect(/[۰-۹]/.test(s)).toBe(true);
  });
});
