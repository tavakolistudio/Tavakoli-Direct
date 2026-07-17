/**
 * Cooldown and duplicate-prevention logic. Pure functions over timestamps so
 * they are trivially testable; the caller supplies "now" and the last-fire time.
 */

export interface CooldownCheck {
  /** Seconds that must elapse between fires for the same key. 0 disables cooldown. */
  cooldownSeconds: number;
  /** When this automation last fired for the relevant scope, or null if never. */
  lastFiredAt: Date | null;
  now?: Date;
}

export interface CooldownResult {
  allowed: boolean;
  reason: string;
  /** Seconds remaining until allowed again (0 when allowed). */
  retryAfterSeconds: number;
}

export function checkCooldown({
  cooldownSeconds,
  lastFiredAt,
  now = new Date(),
}: CooldownCheck): CooldownResult {
  if (cooldownSeconds <= 0 || lastFiredAt === null) {
    return { allowed: true, reason: 'no cooldown in effect', retryAfterSeconds: 0 };
  }
  const elapsedMs = now.getTime() - lastFiredAt.getTime();
  const cooldownMs = cooldownSeconds * 1000;
  if (elapsedMs >= cooldownMs) {
    return { allowed: true, reason: 'cooldown elapsed', retryAfterSeconds: 0 };
  }
  const retryAfterSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
  return {
    allowed: false,
    reason: `within cooldown window (${retryAfterSeconds}s remaining)`,
    retryAfterSeconds,
  };
}

/**
 * Max-executions-per-contact guard. Returns whether another execution is allowed.
 * `maxExecutions` of null/0 means unlimited.
 */
export function checkMaxExecutions(
  currentCount: number,
  maxExecutions: number | null,
): CooldownResult {
  if (maxExecutions === null || maxExecutions <= 0) {
    return { allowed: true, reason: 'unlimited executions', retryAfterSeconds: 0 };
  }
  if (currentCount < maxExecutions) {
    return {
      allowed: true,
      reason: `${currentCount}/${maxExecutions} executions used`,
      retryAfterSeconds: 0,
    };
  }
  return {
    allowed: false,
    reason: `max executions per contact reached (${maxExecutions})`,
    retryAfterSeconds: 0,
  };
}
