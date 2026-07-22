-- Idempotent, additive schema sync run on every Vercel build (see apps/web build
-- script). Used instead of `prisma migrate deploy` because the production
-- database's migration history predates the Prisma migrations folder, so a full
-- migrate deploy would try to replay the baseline. These two statements only ADD
-- (an enum value and a column with a default) and never touch existing data.
ALTER TYPE "ActionType" ADD VALUE IF NOT EXISTS 'AI_REPLY';
ALTER TABLE "Automation" ADD COLUMN IF NOT EXISTS "aiManaged" BOOLEAN NOT NULL DEFAULT false;
