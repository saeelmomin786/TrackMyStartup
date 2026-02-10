-- Add WhatsApp Group Link support to incubation_opportunities table
-- This allows facilitators to share group links with applicants

-- 1. Add the whatsapp_link column
ALTER TABLE IF EXISTS public.incubation_opportunities
ADD COLUMN IF NOT EXISTS whatsapp_link VARCHAR(500) DEFAULT NULL;

-- 2. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_incubation_opportunities_whatsapp_link 
ON public.incubation_opportunities(whatsapp_link) 
WHERE whatsapp_link IS NOT NULL;

-- 3. Add comment for documentation
COMMENT ON COLUMN public.incubation_opportunities.whatsapp_link IS 'WhatsApp group link shared with applicants (format: https://chat.whatsapp.com/...)';

-- Verification query - check if column was added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'incubation_opportunities' 
AND column_name = 'whatsapp_link';
