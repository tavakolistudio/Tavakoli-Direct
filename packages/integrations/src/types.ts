/**
 * Provider abstraction for Instagram messaging. The app and worker only ever
 * talk to this interface, so the mock and Meta implementations are swappable.
 */
import type { NormalizedInstagramEvent } from '@tavakoli/core';

export interface ProviderCapabilities {
  /** Send direct-message text. */
  sendText: boolean;
  /** Send media (image) in a DM. */
  sendMedia: boolean;
  /** Private reply to a comment (official Meta feature; time-limited). */
  privateReply: boolean;
  /** Public reply to a comment. */
  publicCommentReply: boolean;
  /** Story reply trigger support (payload availability varies). */
  storyReply: boolean;
  /** Quick-reply buttons. */
  quickReplies: boolean;
}

export interface WebhookVerifyInput {
  /** Exact raw request body (bytes as received) needed for HMAC verification. */
  rawBody: string;
  /** Value of the X-Hub-Signature-256 header (e.g. "sha256=abc..."). */
  signature: string | null;
}

export interface SendTextInput {
  providerAccountId: string;
  recipientScopedId: string;
  text: string;
  /** Access token (decrypted just-in-time by the caller; never logged). */
  accessToken?: string;
}

export interface SendMediaInput extends Omit<SendTextInput, 'text'> {
  mediaUrl: string;
  caption?: string;
  /** Attachment kind Meta expects. Defaults to image for older callers. */
  mediaType?: 'image' | 'audio' | 'video';
}

export interface PrivateReplyInput {
  providerAccountId: string;
  commentId: string;
  text: string;
  accessToken?: string;
}

export interface CommentReplyInput {
  providerAccountId: string;
  commentId: string;
  text: string;
  accessToken?: string;
}

export interface SendResult {
  success: boolean;
  providerMessageId?: string;
  /** Present when success is false; a structured provider error shape. */
  error?: { code?: number; subcode?: number; type?: string; message?: string; httpStatus?: number };
}

export interface InstagramMessagingProvider {
  readonly name: 'mock' | 'meta';
  getCapabilities(providerAccountId: string): Promise<ProviderCapabilities>;
  verifyWebhook(input: WebhookVerifyInput): Promise<boolean>;
  parseWebhook(payload: unknown): Promise<NormalizedInstagramEvent[]>;
  sendText(input: SendTextInput): Promise<SendResult>;
  sendMedia(input: SendMediaInput): Promise<SendResult>;
  sendPrivateReply(input: PrivateReplyInput): Promise<SendResult>;
  sendPublicCommentReply(input: CommentReplyInput): Promise<SendResult>;
}
