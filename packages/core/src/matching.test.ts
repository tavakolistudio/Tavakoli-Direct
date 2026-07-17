import { describe, expect, it } from 'vitest';
import { matchKeyword } from './matching';

const price = { keywords: ['قیمت', 'هزینه', 'تعرفه'] };

describe('matchKeyword — CONTAINS', () => {
  it('matches a keyword inside a sentence', () => {
    const r = matchKeyword('سلام، قیمت خدمات چقدره؟', { mode: 'CONTAINS', ...price });
    expect(r.matched).toBe(true);
    expect(r.matchedKeyword).toBe('قیمت');
  });

  it('matches despite Arabic yeh/kaf and Persian digits', () => {
    const r = matchKeyword('هزينه ۲تا عکس', { mode: 'CONTAINS', keywords: ['هزینه'] });
    expect(r.matched).toBe(true);
  });

  it('does not match unrelated text', () => {
    const r = matchKeyword('سلام خوبی؟', { mode: 'CONTAINS', ...price });
    expect(r.matched).toBe(false);
  });
});

describe('matchKeyword — EXACT', () => {
  it('matches only when the whole normalized text equals the keyword', () => {
    expect(matchKeyword(' قیمت ', { mode: 'EXACT', keywords: ['قیمت'] }).matched).toBe(true);
    expect(matchKeyword('قیمت خدمات', { mode: 'EXACT', keywords: ['قیمت'] }).matched).toBe(false);
  });
});

describe('matchKeyword — STARTS_WITH', () => {
  it('matches when text starts with the keyword', () => {
    expect(matchKeyword('قیمت چنده', { mode: 'STARTS_WITH', keywords: ['قیمت'] }).matched).toBe(
      true,
    );
    expect(matchKeyword('سلام قیمت', { mode: 'STARTS_WITH', keywords: ['قیمت'] }).matched).toBe(
      false,
    );
  });
});

describe('matchKeyword — ANY_OF', () => {
  it('matches when any of several keywords is present', () => {
    const r = matchKeyword('تعرفه عکاسی', { mode: 'ANY_OF', ...price });
    expect(r.matched).toBe(true);
    expect(r.matchedKeyword).toBe('تعرفه');
  });
});

describe('matchKeyword — guards', () => {
  it('does not match when no keywords configured', () => {
    expect(matchKeyword('قیمت', { mode: 'CONTAINS', keywords: [] }).matched).toBe(false);
  });
  it('does not match empty input', () => {
    expect(matchKeyword('', { mode: 'CONTAINS', ...price }).matched).toBe(false);
  });
});
