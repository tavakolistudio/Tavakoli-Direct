import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { encryptSecret, prisma } from '@tavakoli/database';
import { audit } from '@/lib/audit';
import { requireAdmin } from '@/lib/guards';
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchInstagramProfile,
  subscribeAccountToWebhooks,
  INSTAGRAM_SCOPES,
} from '@/server/instagram-oauth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATE_COOKIE = 'ig_oauth_state';

function back(request: Request, params: string): Response {
  return NextResponse.redirect(new URL(`/instagram-accounts?${params}`, request.url));
}

/**
 * OAuth callback: verifies state, exchanges the code for a long-lived token,
 * then stores the account plus its ENCRYPTED credential. The raw token is never
 * returned to the browser or logged.
 */
export async function GET(request: Request): Promise<Response> {
  const admin = await requireAdmin();
  const url = new URL(request.url);

  const error = url.searchParams.get('error');
  if (error) return back(request, `error=denied`);

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return back(request, 'error=missing_code');

  // ── CSRF check ───────────────────────────────────────────────────────────
  const store = await cookies();
  const expectedNonce = store.get(STATE_COOKIE)?.value;
  store.delete(STATE_COOKIE);

  let clientId: string;
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString()) as {
      nonce?: string;
      clientId?: string;
    };
    if (!parsed.nonce || !parsed.clientId || parsed.nonce !== expectedNonce) {
      return back(request, 'error=state_mismatch');
    }
    clientId = parsed.clientId;
  } catch {
    return back(request, 'error=state_invalid');
  }

  try {
    // ── Token exchange ─────────────────────────────────────────────────────
    const shortLived = await exchangeCodeForToken(code);
    const longLived = await exchangeForLongLivedToken(shortLived.accessToken);
    const profile = await fetchInstagramProfile(longLived.accessToken);

    const expiresAt = new Date(Date.now() + longLived.expiresIn * 1000);
    const encrypted = encryptSecret(longLived.accessToken);

    // ── Persist account + encrypted credential ─────────────────────────────
    const account = await prisma.instagramAccount.upsert({
      where: { providerAccountId: profile.id },
      update: {
        clientId,
        username: profile.username,
        status: 'CONNECTED',
        tokenStatus: 'VALID',
        provider: 'meta',
        connectionError: null,
        lastSyncedAt: new Date(),
        deletedAt: null,
      },
      create: {
        clientId,
        providerAccountId: profile.id,
        username: profile.username,
        status: 'CONNECTED',
        tokenStatus: 'VALID',
        provider: 'meta',
        lastSyncedAt: new Date(),
      },
    });

    await prisma.instagramCredential.upsert({
      where: { accountId: account.id },
      update: {
        encryptedToken: encrypted.ciphertext,
        tokenIv: encrypted.iv,
        tokenAuthTag: encrypted.authTag,
        scopes: [...INSTAGRAM_SCOPES],
        expiresAt,
      },
      create: {
        accountId: account.id,
        encryptedToken: encrypted.ciphertext,
        tokenIv: encrypted.iv,
        tokenAuthTag: encrypted.authTag,
        scopes: [...INSTAGRAM_SCOPES],
        expiresAt,
      },
    });

    // Without this the account connects but Instagram never delivers webhooks.
    const subscription = await subscribeAccountToWebhooks(longLived.accessToken);
    await prisma.instagramAccount.update({
      where: { id: account.id },
      data: {
        webhookStatus: subscription.ok ? 'VERIFIED' : 'FAILED',
        connectionError: subscription.ok ? null : subscription.error,
      },
    });

    await audit({
      actorId: admin.id,
      action: 'INSTAGRAM_CONNECT',
      entityType: 'InstagramAccount',
      entityId: account.id,
      metadata: { provider: 'meta', username: profile.username },
    });

    return back(request, `connected=${encodeURIComponent(profile.username)}`);
  } catch (err) {
    // Never leak the token or full provider payload.
    console.error('instagram oauth callback failed:', (err as Error).message);
    return back(request, 'error=exchange_failed');
  }
}
