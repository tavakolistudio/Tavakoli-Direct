/**
 * Shared validation helpers used by automations (e.g. capturing a phone number)
 * and forms. Digits are normalized first so Persian/Arabic numerals are accepted.
 */
import { normalizeDigits } from './persian';

/**
 * Normalize and validate an Iranian mobile number. Accepts Persian/Arabic
 * digits, spaces, dashes, and +98 / 0098 / 09 prefixes. Returns the canonical
 * `09xxxxxxxxx` form or null when invalid.
 */
export function normalizeIranMobile(input: string): string | null {
  if (!input) return null;
  let s = normalizeDigits(input).replace(/[\s\-()]/g, '');
  if (s.startsWith('+98')) s = '0' + s.slice(3);
  else if (s.startsWith('0098')) s = '0' + s.slice(4);
  else if (s.startsWith('98') && s.length === 12) s = '0' + s.slice(2);
  else if (s.startsWith('9') && s.length === 10) s = '0' + s;
  if (/^09\d{9}$/.test(s)) return s;
  return null;
}

export function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
}
