/**
 * Pure automation-evaluation engine. Given a normalized event and the candidate
 * automations for an account, it decides which single automation should respond,
 * records why each matched or was skipped, and reports cooldown/limit decisions.
 *
 * This is shared by the worker (real execution) and the dry-run tester (no send),
 * guaranteeing the preview matches production behavior.
 */
import { isOutsideBusinessHours, type WeeklyBusinessHours } from './business-hours';
import { checkCooldown, checkMaxExecutions } from './cooldown';
import { matchKeyword, type KeywordRule, type MatchResult } from './matching';
import { normalizePersian } from './persian';
import { resolveConflict, type Candidate } from './priority';
import type { NormalizedInstagramEvent, TriggerType } from './types';

/** Match specificity by mode — more specific matches win ties. */
const MODE_SPECIFICITY: Record<string, number> = {
  EXACT: 3,
  STARTS_WITH: 2,
  ANY_OF: 1,
  CONTAINS: 1,
};

export interface AutomationTriggerDef {
  triggerType: TriggerType;
  keywordRule?: KeywordRule;
  /** For COMMENT_KEYWORD: restrict to a specific media/post id (more specific). */
  mediaId?: string | null;
  /**
   * For COMMENT_KEYWORD: when true, ANY comment matches (keywords are ignored).
   * Only meaningful with a mediaId set — a page-wide any-comment rule would
   * answer every comment on every post, which is never what's wanted.
   */
  matchAnyComment?: boolean;
  /** Provider capability gate (e.g. story replies). If false, the trigger is skipped. */
  capabilityAvailable?: boolean;
}

export interface AutomationDef {
  automationId: string;
  name: string;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  trigger: AutomationTriggerDef;
  cooldownSeconds: number;
  maxExecutionsPerContact: number | null;
}

export interface EvaluationContext {
  now?: Date;
  businessHours?: WeeklyBusinessHours;
  /** Per-automation last fire time for the current contact/scope. */
  lastFiredAt: Record<string, Date | null>;
  /** Per-automation execution count for the current contact. */
  executionCount: Record<string, number>;
}

export interface AutomationTrace {
  automationId: string;
  name: string;
  matched: boolean;
  selected: boolean;
  reason: string;
  blockedReason?: string;
}

export interface EvaluationResult {
  normalizedInput: string;
  winner: AutomationDef | null;
  matchedKeyword?: string;
  traces: AutomationTrace[];
  /** True when the winner is blocked by cooldown/limit and must not fire. */
  blocked: boolean;
  blockedReason?: string;
}

function triggerMatchesEventKind(
  triggerType: TriggerType,
  kind: NormalizedInstagramEvent['kind'],
): boolean {
  switch (triggerType) {
    case 'DM_KEYWORD':
    case 'OUTSIDE_BUSINESS_HOURS':
    case 'NO_RULE_MATCHED':
      return kind === 'DM';
    case 'COMMENT_KEYWORD':
      return kind === 'COMMENT';
    case 'STORY_REPLY_KEYWORD':
      return kind === 'STORY_REPLY';
  }
}

function evaluateTrigger(
  def: AutomationDef,
  event: NormalizedInstagramEvent,
  ctx: EvaluationContext,
): { matched: boolean; result: MatchResult; specificity: number } {
  const t = def.trigger;

  if (!triggerMatchesEventKind(t.triggerType, event.kind)) {
    return {
      matched: false,
      result: { matched: false, reason: 'event kind mismatch' },
      specificity: 0,
    };
  }

  if (t.triggerType === 'STORY_REPLY_KEYWORD' && t.capabilityAvailable === false) {
    return {
      matched: false,
      result: { matched: false, reason: 'story reply capability unavailable' },
      specificity: 0,
    };
  }

  switch (t.triggerType) {
    case 'DM_KEYWORD':
    case 'STORY_REPLY_KEYWORD': {
      if (!t.keywordRule) {
        return {
          matched: false,
          result: { matched: false, reason: 'no keyword rule' },
          specificity: 0,
        };
      }
      const r = matchKeyword(event.text ?? '', t.keywordRule);
      return {
        matched: r.matched,
        result: r,
        specificity: MODE_SPECIFICITY[t.keywordRule.mode] ?? 1,
      };
    }
    case 'COMMENT_KEYWORD': {
      if (t.mediaId && t.mediaId !== event.mediaId) {
        return {
          matched: false,
          result: { matched: false, reason: 'post id mismatch' },
          specificity: 0,
        };
      }
      // "Any comment on this post" mode: no keyword needed. Deliberately the
      // LEAST specific comment match, so a keyword rule on the same post still
      // wins when both apply.
      if (t.matchAnyComment) {
        return {
          matched: true,
          result: { matched: true, reason: 'any comment on post', matchedKeyword: undefined },
          specificity: t.mediaId ? 2 : 0,
        };
      }
      if (!t.keywordRule) {
        return {
          matched: false,
          result: { matched: false, reason: 'no keyword rule' },
          specificity: 0,
        };
      }
      const r = matchKeyword(event.text ?? '', t.keywordRule);
      // A post-specific rule is more specific than an any-post rule; and a
      // keyword rule is more specific than any-comment (+1).
      const specificity = (MODE_SPECIFICITY[t.keywordRule.mode] ?? 1) + 1 + (t.mediaId ? 2 : 0);
      return { matched: r.matched, result: r, specificity };
    }
    case 'OUTSIDE_BUSINESS_HOURS': {
      if (!ctx.businessHours) {
        return {
          matched: false,
          result: { matched: false, reason: 'no business hours configured' },
          specificity: 0,
        };
      }
      const outside = isOutsideBusinessHours(ctx.businessHours, ctx.now ?? new Date());
      return {
        matched: outside,
        result: {
          matched: outside,
          reason: outside ? 'outside business hours' : 'within business hours',
        },
        specificity: 0,
      };
    }
    case 'NO_RULE_MATCHED':
      // Handled separately as a fallback; never matches directly here.
      return {
        matched: false,
        result: { matched: false, reason: 'fallback trigger' },
        specificity: 0,
      };
  }
}

export function evaluate(
  event: NormalizedInstagramEvent,
  automations: AutomationDef[],
  ctx: EvaluationContext,
): EvaluationResult {
  const now = ctx.now ?? new Date();
  const normalizedInput = normalizePersian(event.text ?? '');
  const traces: AutomationTrace[] = [];
  const candidates: Array<Candidate & { def: AutomationDef; matchedKeyword?: string }> = [];

  for (const def of automations) {
    const { matched, result, specificity } = evaluateTrigger(def, event, ctx);
    if (!matched) {
      traces.push({
        automationId: def.automationId,
        name: def.name,
        matched: false,
        selected: false,
        reason: result.reason,
      });
      continue;
    }
    candidates.push({
      automationId: def.automationId,
      isActive: def.isActive,
      triggerType: def.trigger.triggerType,
      priority: def.priority,
      specificity,
      createdAt: def.createdAt,
      def,
      matchedKeyword: result.matchedKeyword,
    });
  }

  // Fallback: if nothing matched, pick an active NO_RULE_MATCHED automation.
  if (candidates.length === 0) {
    const fallback = automations.find(
      (a) => a.isActive && a.trigger.triggerType === 'NO_RULE_MATCHED' && event.kind === 'DM',
    );
    if (fallback) {
      candidates.push({
        automationId: fallback.automationId,
        isActive: true,
        triggerType: 'NO_RULE_MATCHED',
        priority: fallback.priority,
        specificity: 0,
        createdAt: fallback.createdAt,
        def: fallback,
      });
    }
  }

  const { winner, skipped } = resolveConflict(candidates);
  for (const s of skipped) {
    traces.push({
      automationId: s.candidate.automationId,
      name: (s.candidate as { def: AutomationDef }).def.name,
      matched: true,
      selected: false,
      reason: s.reason,
    });
  }

  if (!winner) {
    return { normalizedInput, winner: null, traces, blocked: false };
  }

  // Cooldown + max-execution guards for the winner.
  const cd = checkCooldown({
    cooldownSeconds: winner.def.cooldownSeconds,
    lastFiredAt: ctx.lastFiredAt[winner.automationId] ?? null,
    now,
  });
  const me = checkMaxExecutions(
    ctx.executionCount[winner.automationId] ?? 0,
    winner.def.maxExecutionsPerContact,
  );
  const blocked = !cd.allowed || !me.allowed;
  const blockedReason = !cd.allowed ? cd.reason : !me.allowed ? me.reason : undefined;

  traces.push({
    automationId: winner.automationId,
    name: winner.def.name,
    matched: true,
    selected: !blocked,
    reason: 'selected as primary automation',
    blockedReason,
  });

  return {
    normalizedInput,
    winner: winner.def,
    matchedKeyword: winner.matchedKeyword,
    traces,
    blocked,
    blockedReason,
  };
}
