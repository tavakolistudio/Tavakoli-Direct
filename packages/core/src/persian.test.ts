import { describe, expect, it } from 'vitest';
import { normalizeDigits, normalizePersian, tokenize, unifyLetters } from './persian';

describe('normalizeDigits', () => {
  it('converts Persian digits to Latin', () => {
    expect(normalizeDigits('۰۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
  });
  it('converts Arabic-Indic digits to Latin', () => {
    expect(normalizeDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });
});

describe('unifyLetters', () => {
  it('unifies Arabic yeh and kaf to Persian forms', () => {
    expect(unifyLetters('ياك')).toBe('یاک');
  });
});

describe('normalizePersian', () => {
  it('unifies letters, strips diacritics and zero-width chars, trims', () => {
    // "قيمت" with Arabic yeh + a ZWNJ + tashkeed + surrounding spaces.
    const input = '  قِيمت‌  ';
    expect(normalizePersian(input)).toBe('قیمت');
  });

  it('normalizes a full sentence for contains matching', () => {
    expect(normalizePersian('سلام، قیمت خدمات چقدره؟')).toBe('سلام قیمت خدمات چقدره');
  });

  it('collapses internal whitespace', () => {
    expect(normalizePersian('قیمت    خدمات')).toBe('قیمت خدمات');
  });

  it('returns empty string for empty input', () => {
    expect(normalizePersian('')).toBe('');
  });
});

describe('tokenize', () => {
  it('splits normalized text into tokens', () => {
    expect(tokenize('سلام، قیمت خدمات')).toEqual(['سلام', 'قیمت', 'خدمات']);
  });
});
