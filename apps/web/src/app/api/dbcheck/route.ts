import { NextResponse } from 'next/server';
import { prisma } from '@tavakoli/database';

// TEMPORARY diagnostic route — verifies the runtime database connection and
// schema. Returns no secrets (host only, never credentials). Remove after use.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const raw = process.env.DATABASE_URL ?? '';
  let host = 'unknown';
  try {
    host = new URL(raw).host;
  } catch {
    /* ignore */
  }
  const out: Record<string, unknown> = {
    urlHasSchemaParam: /[?&]schema=/.test(raw),
    schemaParam: /[?&]schema=([^&]+)/.exec(raw)?.[1] ?? null,
    host,
    databaseSchemaEnv: process.env.DATABASE_SCHEMA ?? null,
  };
  try {
    out.userCount = await prisma.user.count();
    out.ok = true;
  } catch (e) {
    out.ok = false;
    out.error = (e as Error).message.slice(0, 500);
  }
  return NextResponse.json(out);
}
