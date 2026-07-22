import 'server-only';
import { prisma } from '@tavakoli/database';

/**
 * Runtime, self-healing schema sync for the AI auto-reply feature.
 *
 * The production database (Railway) could not be migrated at build time — the
 * build environment can't reach it, and its migration history predates the
 * Prisma migrations folder. So instead the two additive, idempotent changes the
 * feature needs are applied lazily at runtime using the app's own (proven)
 * database connection, the first time an AI-replies page or action runs. Both
 * use IF NOT EXISTS, so once applied this is a no-op.
 *
 * This never touches or deletes existing data.
 */
let applied = false;

export async function ensureAiSchema(): Promise<void> {
  if (applied) return;
  try {
    // Each statement runs on its own (autocommit); ALTER TYPE ... ADD VALUE must
    // not run inside a transaction block.
    await prisma.$executeRawUnsafe(`ALTER TYPE "ActionType" ADD VALUE IF NOT EXISTS 'AI_REPLY'`);
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Automation" ADD COLUMN IF NOT EXISTS "aiManaged" BOOLEAN NOT NULL DEFAULT false`,
    );
    applied = true;
  } catch (err) {
    // Best-effort: never break the whole panel if the DDL can't run. The pages
    // that depend on the column will surface the underlying error themselves.
    console.error('ensureAiSchema failed', err);
  }
}
