-- Add the AI_REPLY automation action, used by the AI auto-reply feature to draft
-- a private DM reply to a comment from a step's knowledge base.
ALTER TYPE "ActionType" ADD VALUE IF NOT EXISTS 'AI_REPLY';
