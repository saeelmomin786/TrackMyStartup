-- Fix opportunity_applications table to include domain column
-- This ensures domain information is properly stored when startups apply

-- Add domain column if it doesn't exist
ALTER TABLE public.opportunity_applications 
ADD COLUMN IF NOT EXISTS domain TEXT;

-- Add stage column if it doesn't exist  
ALTER TABLE public.opportunity_applications 
ADD COLUMN IF NOT EXISTS stage TEXT;

-- Update existing records to copy sector to domain if domain is null
UPDATE public.opportunity_applications 
SET domain = sector 
WHERE domain IS NULL AND sector IS NOT NULL;

-- Verify the changes
SELECT 
  startup_id,
  domain,
  sector,
  stage,
  status
FROM public.opportunity_applications 
ORDER BY created_at DESC 
LIMIT 10;
