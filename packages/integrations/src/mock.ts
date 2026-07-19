/**
 * MockInstagramProvider — lets the whole product run and be tested with no Meta
 * credentials. Sends "succeed" by producing a synthetic provider message id.
 *
 * To exercise error paths from /dev/mock-events, the recipient scoped id may
 * carry a marker suffix which maps to a structured provider error:
 *   ...::fail-rate-limit  → code 4   (rate limit, retryable)
 *   ...::fail-token       → code 190 (auth, reconnect)
 *   ...::fail-temporary   → HTTP 503 (temporary, retryable)
 *   ...::fail-permanent   → code 100 (permanent)
 */
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { NormalizedInstagramEvent } from '@tavakoli/core';
import type {
  CommentReplyInput,
  InstagramMessagingProvider,
  PrivateReplyInput,
  ProviderCapabilities,
  SendMediaInput,
  SendResult,
  SendTextInput,
  WebhookVerifyInput,
} from './types';

const mockCapabilities: ProviderCapabilities = {
  sendText: true,
  sendMedia: true,
  privateReply: true,
  publicCommentReply: true,
  storyReply: false, // gated off by default in mock, like a not-yet-approved app
  quickReplies: true,
};

/** Mock webhook payload shape produced by /dev/mock-events and fixtures. */
const mockEventSchema = z.object({
  kind: z.enum(['DM', 'COMMENT', 'STORY_REPLY', 'DELIVERY', 'READ', 'TOKEN_EXPIRED']),
  providerAccountId: z.string(),
  senderScopedId: z.string(),
  senderUsername: z.string().optional(),
  text: z.string().optional(),
  mediaId: z.string().optional(),
  commentId: z.string().optional(),
  providerMessageId: z.string().optional(),
  providerTimestamp: z.string().optional(),
});

const mockPayloadSchema = z.object({
  provider: z.literal('mock'),
  events: z.array(mockEventSchema),
});

function resultFromMarker(recipient: string): SendResult {
  const marker = recipient.split('::')[1];
  switch (marker) {
    case 'fail-rate-limit':
      return { success: false, error: { code: 4, message: 'Application request limit reached' } };
    case 'fail-token':
      return {
        success: false,
        error: { code: 190, type: 'OAuthException', message: 'Token expired' },
      };
    case 'fail-temporary':
      return { success: false, error: { httpStatus: 503, message: 'Temporarily unavailable' } };
    case 'fail-permanent':
      return { success: false, error: { code: 100, message: 'Invalid parameter' } };
    default:
      return { success: true, providerMessageId: `mock-msg-${randomUUID()}` };
  }
}

export class MockInstagramProvider implements InstagramMessagingProvider {
  readonly name = 'mock' as const;

  async getCapabilities(): Promise<ProviderCapabilities> {
    return mockCapabilities;
  }

  /** No signature in mock mode; always considered verified. */
  async verifyWebhook(_input: WebhookVerifyInput): Promise<boolean> {
    return true;
  }

  async parseWebhook(payload: unknown): Promise<NormalizedInstagramEvent[]> {
    const parsed = mockPayloadSchema.safeParse(payload);
    if (!parsed.success) return [];
    return parsed.data.events.map((e) => ({ ...e, raw: e }));
  }

  async sendText(input: SendTextInput): Promise<SendResult> {
    return resultFromMarker(input.recipientScopedId);
  }

  async sendMedia(input: SendMediaInput): Promise<SendResult> {
    return resultFromMarker(input.recipientScopedId);
  }

  async sendPrivateReply(input: PrivateReplyInput): Promise<SendResult> {
    return resultFromMarker(input.commentId);
  }

  async contactFollowsBusiness(): Promise<boolean | null> {
    return true;
  }

  async hideComment(): Promise<SendResult> {
    return { success: true };
  }

  async sendPublicCommentReply(input: CommentReplyInput): Promise<SendResult> {
    return resultFromMarker(input.commentId);
  }
}
