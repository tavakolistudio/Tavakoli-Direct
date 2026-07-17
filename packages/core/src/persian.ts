/**
 * Persian/Arabic text normalization for reliable keyword matching.
 *
 * Instagram users type the same word many ways: Arabic vs Persian letters,
 * Persian vs Arabic vs Latin digits, stray diacritics, zero-width joiners, and
 * inconsistent spacing/punctuation. We normalize both the incoming text and the
 * configured keywords through the same function so matching is deterministic.
 *
 * Normalization is intentionally conservative: it unifies letter forms and
 * strips noise, but does not stem or transliterate.
 */

/** Arabic-Indic (٠-٩) and Persian (۰-۹) digit code point bases. */
const ARABIC_INDIC_ZERO = 0x0660;
const PERSIAN_ZERO = 0x06f0;

/** Diacritics / tashkeel to remove (harakat, tatweel, etc.). */
// eslint-disable-next-line no-misleading-character-class
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

/** Zero-width characters: ZWNJ, ZWJ, ZWSP, ZWNBSP/BOM, LRM/RLM marks. */
const ZERO_WIDTH = /[​‌‍‎‏﻿]/g;

/** Letter unification map: Arabic forms → Persian canonical forms. */
const LETTER_MAP: Record<string, string> = {
  'ي': 'ی', // ي (Arabic yeh) → ی (Persian yeh)
  'ى': 'ی', // ى (alef maksura) → ی
  'ك': 'ک', // ك (Arabic kaf) → ک (Persian kaf)
  'ة': 'ه', // ة (teh marbuta) → ه
  'أ': 'ا', // أ → ا
  'إ': 'ا', // إ → ا
  'آ': 'ا', // آ → ا
  'ؤ': 'و', // ؤ → و
  'ئ': 'ی', // ئ → ی
};

/** Convert any Persian/Arabic-Indic digit in the string to a Latin digit. */
export function normalizeDigits(input: string): string {
  let out = '';
  for (const ch of input) {
    const code = ch.codePointAt(0)!;
    if (code >= ARABIC_INDIC_ZERO && code <= ARABIC_INDIC_ZERO + 9) {
      out += String(code - ARABIC_INDIC_ZERO);
    } else if (code >= PERSIAN_ZERO && code <= PERSIAN_ZERO + 9) {
      out += String(code - PERSIAN_ZERO);
    } else {
      out += ch;
    }
  }
  return out;
}

/** Replace Arabic letter variants with their Persian canonical forms. */
export function unifyLetters(input: string): string {
  let out = '';
  for (const ch of input) {
    out += LETTER_MAP[ch] ?? ch;
  }
  return out;
}

/**
 * Collapse Persian, Arabic, and common Latin punctuation to spaces so keyword
 * boundaries are consistent. Keeps letters, digits, and combining marks intact.
 */
function stripPunctuation(input: string): string {
  return input.replace(/[!-\/:-@\[-`{-~؛،؟…«»”“‘’—–]/g, ' ');
}

/**
 * Full normalization pipeline used for keyword matching.
 *
 * Steps: Unicode NFC → remove zero-width chars → remove diacritics/tatweel →
 * unify Arabic→Persian letters → normalize digits → lowercase (for Latin) →
 * strip punctuation → collapse whitespace → trim.
 */
export function normalizePersian(input: string): string {
  if (!input) return '';
  let s = input.normalize('NFC');
  s = s.replace(ZERO_WIDTH, '');
  s = s.replace(DIACRITICS, '');
  s = unifyLetters(s);
  s = normalizeDigits(s);
  s = s.toLowerCase();
  s = stripPunctuation(s);
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/** Normalize and split into whitespace-delimited tokens. */
export function tokenize(input: string): string[] {
  const n = normalizePersian(input);
  return n.length ? n.split(' ') : [];
}
