-- =====================================================
-- ADD WHATSAPP GROUP LINK TO EVENTS
-- =====================================================
-- Run in Supabase SQL Editor.

BEGIN;

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS whatsapp_group_link TEXT;

COMMENT ON COLUMN public.events.whatsapp_group_link IS 'Optional WhatsApp group join link shown on post-registration success screen';

COMMIT;
