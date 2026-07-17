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
 *
 * Character classes for diacritics and zero-width characters are built from
 * explicit code-point ranges (not literal regex classes) so the source contains
 * no invisible characters.
 */

/** Arabic-Indic (U+0660-9) and Persian (U+06F0-9) digit code point bases. */
const ARABIC_INDIC_ZERO = 0x0660;
const PERSIAN_ZERO = 0x06f0;

/** Build a global-match character-class RegExp from inclusive code-point ranges. */
function classFromRanges(ranges: ReadonlyArray<readonly [number, number]>): RegExp {
  const body = ranges
    .map(([a, b]) =>
      a === b ? String.fromCodePoint(a) : `${String.fromCodePoint(a)}-${String.fromCodePoint(b)}`,
    )
    .join('');
  return new RegExp(`[${body}]`, 'gu');
}

/**
 * Diacritics / tashkeel to remove: harakat (U+064B-U+0652), superscript alef
 * (U+0670), tatweel/kashida (U+0640), and Quranic marks (U+06D6-U+06ED).
 */
const DIACRITICS = classFromRanges([
  [0x064b, 0x0652],
  [0x0670, 0x0670],
  [0x0640, 0x0640],
  [0x06d6, 0x06ed],
]);

/** Zero-width chars: ZWSP, ZWNJ, ZWJ, LRM, RLM (U+200B-U+200F) and BOM (U+FEFF). */
const ZERO_WIDTH = classFromRanges([
  [0x200b, 0x200f],
  [0xfeff, 0xfeff],
]);

/** Letter unification map: Arabic forms -> Persian canonical forms. */
const LETTER_MAP: Record<string, string> = {
  ي: 'ی', // Arabic yeh -> Persian yeh
  ى: 'ی', // alef maksura -> yeh
  ك: 'ک', // Arabic kaf -> Persian kaf
  ة: 'ه', // teh marbuta -> heh
  أ: 'ا', // alef with hamza above -> alef
  إ: 'ا', // alef with hamza below -> alef
  آ: 'ا', // alef madda -> alef
  ؤ: 'و', // waw with hamza -> waw
  ئ: 'ی', // yeh with hamza -> yeh
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
 * Collapse any character that is not a letter, digit, or whitespace to a space,
 * so keyword boundaries are consistent across Persian, Arabic, and Latin
 * punctuation. Diacritics are already removed before this step.
 */
function stripPunctuation(input: string): string {
  return input.replace(/[^\p{L}\p{N}\s]/gu, ' ');
}

/**
 * Full normalization pipeline used for keyword matching.
 *
 * Steps: Unicode NFC -> remove zero-width chars -> remove diacritics/tatweel ->
 * unify Arabic->Persian letters -> normalize digits -> lowercase (for Latin) ->
 * strip punctuation -> collapse whitespace -> trim.
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
