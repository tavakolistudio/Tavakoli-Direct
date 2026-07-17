/**
 * Deterministic conflict resolution when multiple automations match one event.
 *
 * Order (highest priority first), per the product spec:
 *   1. Account-specific active status  (inactive automations never win)
 *   2. Trigger type                    (specific keyword triggers beat fallbacks)
 *   3. Explicit priority               (higher number wins)
 *   4. Most specific match             (higher specificity wins)
 *   5. Creation date                   (earliest created wins — final tie-breaker)
 *
 * Only ONE primary response automation is selected. The rest are recorded as
 * "matched but not selected" for auditability.
 */
import type { TriggerType } from './types';

/** Lower rank = higher precedence. Keyword triggers beat contextual fallbacks. */
const TRIGGER_RANK: Record<TriggerType, number> = {
  DM_KEYWORD: 0,
  COMMENT_KEYWORD: 0,
  STORY_REPLY_KEYWORD: 0,
  OUTSIDE_BUSINESS_HOURS: 1,
  NO_RULE_MATCHED: 2,
};

export interface Candidate {
  automationId: string;
  isActive: boolean;
  triggerType: TriggerType;
  /** Admin-set priority; higher wins. */
  priority: number;
  /** Match specificity; higher wins (e.g. EXACT > STARTS_WITH > CONTAINS, specific post > any post). */
  specificity: number;
  createdAt: Date;
}

export interface Resolution<T extends Candidate> {
  winner: T | null;
  /** Candidates that matched but were not selected, with the deciding factor. */
  skipped: Array<{ candidate: T; reason: string }>;
}

/** Compare two candidates; returns negative if `a` should win over `b`. */
export function compareCandidates(a: Candidate, b: Candidate): number {
  // 1. active status
  if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
  // 2. trigger type rank
  const rank = TRIGGER_RANK[a.triggerType] - TRIGGER_RANK[b.triggerType];
  if (rank !== 0) return rank;
  // 3. explicit priority (higher wins)
  if (a.priority !== b.priority) return b.priority - a.priority;
  // 4. specificity (higher wins)
  if (a.specificity !== b.specificity) return b.specificity - a.specificity;
  // 5. creation date (earliest wins)
  return a.createdAt.getTime() - b.createdAt.getTime();
}

export function resolveConflict<T extends Candidate>(candidates: T[]): Resolution<T> {
  const active = candidates.filter((c) => c.isActive);
  if (active.length === 0) {
    return { winner: null, skipped: candidates.map((c) => ({ candidate: c, reason: 'inactive' })) };
  }

  const sorted = [...active].sort(compareCandidates);
  const winner = sorted[0]!;
  const skipped = sorted.slice(1).map((candidate) => ({
    candidate,
    reason: describeLoss(winner, candidate),
  }));
  // Include inactive candidates in the skipped list for full auditability.
  for (const c of candidates) {
    if (!c.isActive) skipped.push({ candidate: c, reason: 'inactive' });
  }
  return { winner, skipped };
}

function describeLoss(winner: Candidate, loser: Candidate): string {
  if (TRIGGER_RANK[winner.triggerType] !== TRIGGER_RANK[loser.triggerType]) {
    return `lower trigger precedence than ${winner.triggerType}`;
  }
  if (winner.priority !== loser.priority) return `lower priority than winner (${winner.priority})`;
  if (winner.specificity !== loser.specificity) return 'less specific match than winner';
  return 'created after the winner';
}
