/**
 * Keyword matching for automation triggers. All comparisons run on
 * Persian-normalized text (see persian.ts) so letter/digit/spacing variants match.
 */
import { normalizePersian } from './persian';
import type { KeywordMatchMode } from './types';

export interface KeywordRule {
  mode: KeywordMatchMode;
  /** Raw keywords as configured by the admin; normalized internally. */
  keywords: string[];
}

export interface MatchResult {
  matched: boolean;
  /** The keyword (normalized) that caused the match, if any. */
  matchedKeyword?: string;
  /** Human-readable reason, recorded on the execution for auditability. */
  reason: string;
}

/**
 * Evaluate a keyword rule against input text.
 *
 * - EXACT: normalized text equals a normalized keyword.
 * - CONTAINS: normalized text contains a normalized keyword as a substring.
 * - STARTS_WITH: normalized text starts with a normalized keyword.
 * - ANY_OF: CONTAINS semantics across multiple keywords (first hit wins).
 */
export function matchKeyword(text: string, rule: KeywordRule): MatchResult {
  const haystack = normalizePersian(text);
  const keywords = rule.keywords.map((k) => normalizePersian(k)).filter((k) => k.length > 0);

  if (keywords.length === 0) {
    return { matched: false, reason: 'no keywords configured' };
  }
  if (haystack.length === 0) {
    return { matched: false, reason: 'empty input after normalization' };
  }

  for (const kw of keywords) {
    const hit = testSingle(haystack, kw, rule.mode);
    if (hit) {
      return {
        matched: true,
        matchedKeyword: kw,
        reason: `${rule.mode} matched keyword "${kw}"`,
      };
    }
  }

  return {
    matched: false,
    reason: `no ${rule.mode} match among [${keywords.join(', ')}]`,
  };
}

function testSingle(haystack: string, keyword: string, mode: KeywordMatchMode): boolean {
  switch (mode) {
    case 'EXACT':
      return haystack === keyword;
    case 'CONTAINS':
    case 'ANY_OF':
      return containsWord(haystack, keyword);
    case 'STARTS_WITH':
      return haystack === keyword || haystack.startsWith(keyword + ' ');
  }
}

/**
 * Substring match that respects token boundaries when the keyword is a single
 * token, so "قیمت" matches "قیمت خدمات" but a multi-word keyword still matches
 * as a raw substring.
 */
function containsWord(haystack: string, keyword: string): boolean {
  if (keyword.includes(' ')) {
    return haystack.includes(keyword);
  }
  const tokens = haystack.split(' ');
  return tokens.includes(keyword) || haystack.includes(keyword);
}
