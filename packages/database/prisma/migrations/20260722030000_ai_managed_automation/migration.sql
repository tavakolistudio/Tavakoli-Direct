-- Flag automations owned by the standalone "پاسخ هوشمند" (AI auto-reply) section
-- so they are hidden from the regular automations list.
ALTER TABLE "Automation" ADD COLUMN IF NOT EXISTS "aiManaged" BOOLEAN NOT NULL DEFAULT false;
