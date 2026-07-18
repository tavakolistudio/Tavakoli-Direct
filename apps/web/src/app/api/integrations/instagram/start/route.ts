import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { buildAuthorizeUrl, getInstagramAppCredentials } from '@/server/instagram-oauth';
import { requireAdmin } from '@/lib/guards';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATE_COOKIE = 'ig_oauth_state';

/**
 * Starts the Instagram business-login flow for a given client.
 * Admin-only. A random nonce is stored in an httpOnly cookie and echoed in the
 * OAuth `state` to protect against CSRF.
 */
export async function GET(request: Request): Promise<Response> {
  await requireAdmin();

  if (!getInstagramAppCredentials()) {
    return NextResponse.redirect(new URL('/instagram-accounts?error=not_configured', request.url));
  }

  const clientId = new URL(request.url).searchParams.get('clientId');
  if (!clientId) {
    return NextResponse.redirect(new URL('/instagram-accounts?error=missing_client', request.url));
  }

  const nonce = randomBytes(16).toString('hex');
  const state = Buffer.from(JSON.stringify({ nonce, clientId })).toString('base64url');

  const store = await cookies();
  store.set(STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  });

  return NextResponse.redirect(buildAuthorizeUrl(state));
}
