-- Add Organization Description and Website support to incubation_opportunities table
-- These are captured in the "Post New Opportunity" form but were never persisted.

-- 1. Add the columns
ALTER TABLE IF EXISTS public.incubation_opportunities
ADD COLUMN IF NOT EXISTS facilitator_description TEXT DEFAULT NULL;

ALTER TABLE IF EXISTS public.incubation_opportunities
ADD COLUMN IF NOT EXISTS facilitator_website VARCHAR(500) DEFAULT NULL;

-- 2. Add comments for documentation
COMMENT ON COLUMN public.incubation_opportunities.facilitator_description IS 'Description of the facilitator organization shown on the public opportunity page';
COMMENT ON COLUMN public.incubation_opportunities.facilitator_website IS 'Website URL of the facilitator organization shown on the public opportunity page';

-- Verification query - check if columns were added successfully
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'incubation_opportunities'
AND column_name IN ('facilitator_description', 'facilitator_website');
