import { describe, expect, it } from 'vitest';
import { escapeCsvCell, toCsv } from './csv';
import { normalizeIranMobile } from './validation';

describe('escapeCsvCell — injection protection', () => {
  it('neutralizes formula-triggering prefixes', () => {
    expect(escapeCsvCell('=1+2')).toBe(`"'=1+2"`);
    expect(escapeCsvCell('+15551234')).toBe(`"'+15551234"`);
    expect(escapeCsvCell('-2')).toBe(`"'-2"`);
    expect(escapeCsvCell('@cmd')).toBe(`"'@cmd"`);
  });
  it('quotes and escapes embedded quotes', () => {
    expect(escapeCsvCell('a"b')).toBe('"a""b"');
  });
  it('leaves ordinary values quoted but intact', () => {
    expect(escapeCsvCell('علی')).toBe('"علی"');
  });
});

describe('toCsv', () => {
  it('builds CRLF-separated rows with headers', () => {
    const csv = toCsv([{ name: 'علی', note: '=SUM(A1)' }], ['name', 'note']);
    expect(csv).toBe(`"name","note"\r\n"علی","'=SUM(A1)"`);
  });
});

describe('normalizeIranMobile', () => {
  it('accepts Persian digits and +98 form', () => {
    expect(normalizeIranMobile('+۹۸۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
  });
  it('accepts 09xxxxxxxxx', () => {
    expect(normalizeIranMobile('0912 345 6789')).toBe('09123456789');
  });
  it('rejects invalid numbers', () => {
    expect(normalizeIranMobile('12345')).toBeNull();
  });
});
