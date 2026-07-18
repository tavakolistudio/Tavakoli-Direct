/**
 * MetaInstagramProvider — implemented against the official Instagram Graph API
 * shapes. It is GUARDED: it must not be selected without valid Meta credentials
 * (env validation enforces this). Endpoint paths, permission names, and the API
 * version MUST be verified against current official Meta docs before enabling —
 * see docs/META_SETUP.md. The Graph API version comes from configuration
 * (META_GRAPH_API_VERSION), never hardcoded here.
 */
import { env } from '@tavakoli/config';
import type { NormalizedInstagramEvent } from '@tavakoli/core';
import { verifySignature } from './signature';
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

/**
 * Instagram API with Instagram Login issues tokens that are only valid against
 * graph.instagram.com. Sending them to graph.facebook.com fails with
 * "Cannot parse access token", which looks like a credential problem but is
 * really the wrong host.
 */
const GRAPH_BASE = 'https://graph.instagram.com';

function graphUrl(path: string): string {
  return `${GRAPH_BASE}/${env.META_GRAPH_API_VERSION}/${path}`;
}

interface GraphError {
  error?: { code?: number; error_subcode?: number; type?: string; message?: string };
}

async function graphPost(
  path: string,
  body: Record<string, unknown>,
  accessToken: string,
): Promise<SendResult> {
  try {
    const res = await fetch(graphUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, access_token: accessToken }),
    });
    const json = (await res.json().catch(() => ({}))) as GraphError & {
      message_id?: string;
      id?: string;
    };
    if (!res.ok || json.error) {
      return {
        success: false,
        error: {
          code: json.error?.code,
          subcode: json.error?.error_subcode,
          type: json.error?.type,
          message: json.error?.message,
          httpStatus: res.status,
        },
      };
    }
    return { success: true, providerMessageId: json.message_id ?? json.id };
  } catch (err) {
    return { success: false, error: { message: (err as Error).message, httpStatus: 0 } };
  }
}

function requireToken(token: string | undefined): string {
  if (!token) throw new Error('Meta provider requires a decrypted access token');
  return token;
}

export class MetaInstagramProvider implements InstagramMessagingProvider {
  readonly name = 'meta' as const;

  async getCapabilities(): Promise<ProviderCapabilities> {
    // Baseline capabilities; storyReply stays behind approval/verification and is
    // reported as unavailable until confirmed for the connected account.
    return {
      sendText: true,
      sendMedia: true,
      privateReply: true,
      publicCommentReply: true,
      storyReply: false,
      quickReplies: true,
    };
  }

  async verifyWebhook(input: WebhookVerifyInput): Promise<boolean> {
    // Instagram-Login apps sign webhooks with the Instagram app secret; older
    // Facebook-Login apps use the Meta app secret.
    const secret = env.INSTAGRAM_APP_SECRET ?? env.META_APP_SECRET;
    if (!secret) return false;
    return verifySignature(input.rawBody, input.signature, secret);
  }

  async parseWebhook(payload: unknown): Promise<NormalizedInstagramEvent[]> {
    const events: NormalizedInstagramEvent[] = [];
    const body = payload as {
      object?: string;
      entry?: Array<{
        id?: string;
        messaging?: Array<{
          sender?: { id?: string };
          recipient?: { id?: string };
          timestamp?: number;
          message?: { mid?: string; text?: string; is_echo?: boolean };
          delivery?: { mids?: string[] };
          read?: unknown;
        }>;
        changes?: Array<{
          field?: string;
          value?: {
            id?: string;
            text?: string;
            media?: { id?: string };
            from?: { id?: string; username?: string };
          };
        }>;
      }>;
    };
    if (!body?.entry) return events;

    for (const entry of body.entry) {
      const accountId = entry.id ?? '';

      for (const m of entry.messaging ?? []) {
        if (m.message?.is_echo) continue; // ignore our own echoes
        if (m.delivery) {
          events.push({
            kind: 'DELIVERY',
            providerAccountId: accountId,
            senderScopedId: m.recipient?.id ?? '',
            providerMessageId: m.delivery.mids?.[0],
            raw: m,
          });
          continue;
        }
        if (m.message?.text) {
          events.push({
            kind: 'DM',
            providerAccountId: accountId,
            senderScopedId: m.sender?.id ?? '',
            text: m.message.text,
            providerMessageId: m.message.mid,
            providerTimestamp: m.timestamp ? new Date(m.timestamp).toISOString() : undefined,
            raw: m,
          });
        }
      }

      for (const ch of entry.changes ?? []) {
        if (ch.field === 'comments' && ch.value) {
          events.push({
            kind: 'COMMENT',
            providerAccountId: accountId,
            senderScopedId: ch.value.from?.id ?? '',
            senderUsername: ch.value.from?.username,
            text: ch.value.text,
            mediaId: ch.value.media?.id,
            commentId: ch.value.id,
            raw: ch,
          });
        }
      }
    }
    return events;
  }

  async sendText(input: SendTextInput): Promise<SendResult> {
    return graphPost(
      `${input.providerAccountId}/messages`,
      { recipient: { id: input.recipientScopedId }, message: { text: input.text } },
      requireToken(input.accessToken),
    );
  }

  async sendMedia(input: SendMediaInput): Promise<SendResult> {
    return graphPost(
      `${input.providerAccountId}/messages`,
      {
        recipient: { id: input.recipientScopedId },
        message: {
          attachment: {
            type: input.mediaType ?? 'image',
            payload: { url: input.mediaUrl },
          },
        },
      },
      requireToken(input.accessToken),
    );
  }

  async sendPrivateReply(input: PrivateReplyInput): Promise<SendResult> {
    // With Instagram Login a private reply is a normal message addressed to the
    // comment rather than to a user id — there is no private_replies edge here.
    return graphPost(
      `${input.providerAccountId}/messages`,
      { recipient: { comment_id: input.commentId }, message: { text: input.text } },
      requireToken(input.accessToken),
    );
  }

  async sendPublicCommentReply(input: CommentReplyInput): Promise<SendResult> {
    return graphPost(
      `${input.commentId}/replies`,
      { message: input.text },
      requireToken(input.accessToken),
    );
  }
}
