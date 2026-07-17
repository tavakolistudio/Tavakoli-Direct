import { NextResponse } from 'next/server';
import { env } from '@tavakoli/config';
import { ingestEvents, verifyAndParse } from '@/server/webhook-ingest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET — Meta webhook verification handshake.
 * Meta calls with hub.mode=subscribe, hub.verify_token, hub.challenge.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token && token === env.META_VERIFY_TOKEN) {
    return new Response(challenge ?? '', { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

/**
 * POST — webhook event ingestion. Verifies the signature, parses + stores events
 * idempotently, enqueues them, and returns quickly. Automation runs in the worker.
 */
export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');

  const { signatureValid, events } = await verifyAndParse(rawBody, signature);

  // In meta mode an invalid signature is rejected. Mock mode is always valid.
  if (env.INSTAGRAM_PROVIDER === 'meta' && !signatureValid) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  const result = await ingestEvents(events, signatureValid);
  return NextResponse.json({ ok: true, ...result }, { status: 200 });
}
