/**
 * Shared, provider-agnostic constants. The Meta Graph API version is read from
 * the environment (see env.ts) — never hardcode a version elsewhere.
 */

export const APP_NAME = 'Tavakoli Direct';
export const APP_TAGLINE_FA = 'خدمات هوشمند دایرکت ویژه مشتریان Tavakoli Studio';

/** Queue names used by BullMQ across web (producers) and worker (consumers). */
export const QUEUE_NAMES = {
  webhookEvents: 'webhook-events',
  automationExecutions: 'automation-executions',
  outboundMessages: 'outbound-messages',
  mediaProcessing: 'media-processing',
  maintenance: 'maintenance',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/** Session cookie name for the custom credentials auth. */
export const SESSION_COOKIE = 'td_session';

/** Default retry/backoff policy for outbound provider jobs. */
export const OUTBOUND_JOB_POLICY = {
  attempts: 5,
  backoffType: 'exponential' as const,
  backoffDelayMs: 2_000,
};

/** Upload constraints (see security requirements). */
export const UPLOAD_LIMITS = {
  maxBytes: 8 * 1024 * 1024, // 8 MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const,
};

/** Login rate-limit: max failed attempts per window before lockout. */
export const LOGIN_RATE_LIMIT = {
  maxAttempts: 5,
  windowSeconds: 15 * 60,
};

/** Default cooldowns (seconds) used when an automation does not specify one. */
export const DEFAULT_COOLDOWN_SECONDS = {
  outsideBusinessHours: 6 * 60 * 60,
  fallbackToHuman: 24 * 60 * 60,
  commentPrivateReply: 24 * 60 * 60,
};
