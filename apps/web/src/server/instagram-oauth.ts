import 'server-only';
import { env } from '@tavakoli/config';

/**
 * OAuth helpers for "Instagram API with Instagram Login" (business login).
 *
 * Endpoints and scope names follow the current official Meta documentation:
 *   authorize      https://www.instagram.com/oauth/authorize
 *   short-lived    POST https://api.instagram.com/oauth/access_token
 *   long-lived     GET  https://graph.instagram.com/access_token (ig_exchange_token, 60 days)
 *   refresh        GET  https://graph.instagram.com/refresh_access_token (ig_refresh_token)
 *
 * Note: this flow uses the *Instagram* app id/secret, which differ from the
 * Facebook app credentials — hence INSTAGRAM_APP_ID/SECRET with a META_* fallback.
 */

/** Permissions we request. Basic profile + DM + comment management. */
export const INSTAGRAM_SCOPES = [
  'instagram_business_basic',
  'instagram_business_manage_messages',
  'instagram_business_manage_comments',
] as const;

export interface InstagramAppCredentials {
  appId: string;
  appSecret: string;
}

/** Returns the Instagram app credentials, or null when not configured. */
export function getInstagramAppCredentials(): InstagramAppCredentials | null {
  const appId = env.INSTAGRAM_APP_ID ?? env.META_APP_ID;
  const appSecret = env.INSTAGRAM_APP_SECRET ?? env.META_APP_SECRET;
  if (!appId || !appSecret) return null;
  return { appId, appSecret };
}

/** The redirect URI must exactly match the one registered in the Meta dashboard. */
export function getRedirectUri(): string {
  return `${env.APP_URL.replace(/\/$/, '')}/api/integrations/instagram/callback`;
}

export function buildAuthorizeUrl(state: string): string {
  const creds = getInstagramAppCredentials();
  if (!creds) throw new Error('Instagram app credentials are not configured');
  const url = new URL('https://www.instagram.com/oauth/authorize');
  url.searchParams.set('client_id', creds.appId);
  url.searchParams.set('redirect_uri', getRedirectUri());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', INSTAGRAM_SCOPES.join(','));
  url.searchParams.set('state', state);
  return url.toString();
}

interface ShortLivedToken {
  accessToken: string;
  userId: string;
}

/** Exchange the authorization code for a short-lived token. */
export async function exchangeCodeForToken(code: string): Promise<ShortLivedToken> {
  const creds = getInstagramAppCredentials();
  if (!creds) throw new Error('Instagram app credentials are not configured');

  const body = new URLSearchParams({
    client_id: creds.appId,
    client_secret: creds.appSecret,
    grant_type: 'authorization_code',
    redirect_uri: getRedirectUri(),
    code,
  });

  const res = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    user_id?: string | number;
    error_message?: string;
    error?: unknown;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_message ?? `token exchange failed (${res.status})`);
  }
  return { accessToken: json.access_token, userId: String(json.user_id ?? '') };
}

export interface LongLivedToken {
  accessToken: string;
  /** Seconds until expiry (Meta returns ~60 days). */
  expiresIn: number;
}

/** Exchange a short-lived token for a 60-day long-lived token. */
export async function exchangeForLongLivedToken(shortLived: string): Promise<LongLivedToken> {
  const creds = getInstagramAppCredentials();
  if (!creds) throw new Error('Instagram app credentials are not configured');

  const url = new URL('https://graph.instagram.com/access_token');
  url.searchParams.set('grant_type', 'ig_exchange_token');
  url.searchParams.set('client_secret', creds.appSecret);
  url.searchParams.set('access_token', shortLived);

  const res = await fetch(url, { method: 'GET' });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: { message?: string };
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error?.message ?? `long-lived exchange failed (${res.status})`);
  }
  return { accessToken: json.access_token, expiresIn: json.expires_in ?? 60 * 24 * 60 * 60 };
}

export interface InstagramProfile {
  id: string;
  username: string;
}

/** Fetch the connected professional account's id and username. */
export async function fetchInstagramProfile(accessToken: string): Promise<InstagramProfile> {
  const url = new URL('https://graph.instagram.com/me');
  url.searchParams.set('fields', 'id,username');
  url.searchParams.set('access_token', accessToken);

  const res = await fetch(url, { method: 'GET' });
  const json = (await res.json().catch(() => ({}))) as {
    id?: string;
    username?: string;
    error?: { message?: string };
  };
  if (!res.ok || !json.id) {
    throw new Error(json.error?.message ?? `profile fetch failed (${res.status})`);
  }
  return { id: json.id, username: json.username ?? json.id };
}

/** Webhook fields the panel reacts to. */
export const WEBHOOK_FIELDS = ['messages', 'comments'] as const;

export interface SubscribeResult {
  ok: boolean;
  error?: string;
}

/**
 * Subscribes the app to webhooks FOR THIS ACCOUNT.
 *
 * Ticking the fields in the Meta dashboard only declares which events the app
 * wants; Instagram still delivers nothing until each account is individually
 * subscribed through this edge. Without it a page connects and stores a valid
 * token, yet no webhook ever arrives.
 */
export async function subscribeAccountToWebhooks(accessToken: string): Promise<SubscribeResult> {
  const url = new URL('https://graph.instagram.com/v21.0/me/subscribed_apps');
  url.searchParams.set('subscribed_fields', WEBHOOK_FIELDS.join(','));
  url.searchParams.set('access_token', accessToken);

  try {
    const res = await fetch(url, { method: 'POST' });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: { message?: string };
    };
    if (!res.ok || json.success === false) {
      return { ok: false, error: json.error?.message ?? `subscribe failed (${res.status})` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
