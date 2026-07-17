/**
 * Core domain types shared across web and worker. These mirror the Prisma enums
 * but live here so pure domain logic has no database dependency.
 */

export const TRIGGER_TYPES = [
  'DM_KEYWORD',
  'COMMENT_KEYWORD',
  'STORY_REPLY_KEYWORD',
  'OUTSIDE_BUSINESS_HOURS',
  'NO_RULE_MATCHED',
] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export const KEYWORD_MATCH_MODES = ['EXACT', 'CONTAINS', 'STARTS_WITH', 'ANY_OF'] as const;
export type KeywordMatchMode = (typeof KEYWORD_MATCH_MODES)[number];

export const ACTION_TYPES = [
  'SEND_TEXT',
  'SEND_IMAGE',
  'SEND_LINK',
  'SEND_QUICK_REPLIES',
  'WAIT',
  'ADD_TAG',
  'REMOVE_TAG',
  'SAVE_VALUE',
  'UPDATE_LEAD_STATUS',
  'ASSIGN_OPERATOR',
  'NEEDS_HUMAN',
  'PAUSE_AUTOMATION',
  'END_AUTOMATION',
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const AUTOMATION_STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'] as const;
export type AutomationStatus = (typeof AUTOMATION_STATUSES)[number];

export const CONVERSATION_STATUSES = [
  'OPEN',
  'NEEDS_HUMAN',
  'WAITING_CUSTOMER',
  'FOLLOW_UP',
  'RESOLVED',
] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export const LEAD_STATUSES = [
  'NEW',
  'NEEDS_FOLLOW_UP',
  'CONTACTED',
  'POTENTIAL',
  'WON',
  'LOST',
  'CLOSED',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const MESSAGE_DIRECTIONS = ['INBOUND', 'OUTBOUND'] as const;
export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number];

export const MESSAGE_SENDER_TYPES = ['CONTACT', 'AUTOMATION', 'OPERATOR', 'SYSTEM'] as const;
export type MessageSenderType = (typeof MESSAGE_SENDER_TYPES)[number];

export const HANDOFF_REASONS = [
  'NO_RULE_MATCHED',
  'CUSTOMER_REQUESTED_HUMAN',
  'INVALID_PHONE',
  'PROVIDER_ERROR',
  'OPERATOR_PAUSED',
  'SENSITIVE_MESSAGE',
  'SCENARIO_COMPLETED',
] as const;
export type HandoffReason = (typeof HANDOFF_REASONS)[number];

export const USER_ROLES = ['ADMIN', 'OPERATOR'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** A normalized event coming from any provider, independent of Meta payloads. */
export interface NormalizedInstagramEvent {
  kind: 'DM' | 'COMMENT' | 'STORY_REPLY' | 'DELIVERY' | 'READ' | 'TOKEN_EXPIRED';
  providerAccountId: string;
  /** Instagram-scoped user id of the sender/commenter. */
  senderScopedId: string;
  senderUsername?: string;
  /** The user-visible text (DM body, comment text, or story reply text). */
  text?: string;
  /** For comments: the media/post id and the comment id. */
  mediaId?: string;
  commentId?: string;
  /** Provider message id where relevant (DMs, delivery receipts). */
  providerMessageId?: string;
  /** ISO timestamp from the provider, if available. */
  providerTimestamp?: string;
  /** Raw payload retained only where useful (never contains secrets). */
  raw?: unknown;
}
