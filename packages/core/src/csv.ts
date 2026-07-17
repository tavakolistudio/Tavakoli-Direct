/**
 * CSV generation with injection protection. Spreadsheet apps execute cells that
 * begin with = + - @ (and tab/CR), so those are neutralized by prefixing a
 * single quote. Values are always quoted and internal quotes doubled.
 */

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (FORMULA_PREFIX.test(s)) {
    s = `'${s}`;
  }
  // Always quote; double any embedded quotes.
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(rows: Array<Record<string, unknown>>, headers: string[]): string {
  const headerLine = headers.map((h) => escapeCsvCell(h)).join(',');
  const lines = rows.map((row) => headers.map((h) => escapeCsvCell(row[h])).join(','));
  // CRLF line endings for maximum spreadsheet compatibility.
  return [headerLine, ...lines].join('\r\n');
}
