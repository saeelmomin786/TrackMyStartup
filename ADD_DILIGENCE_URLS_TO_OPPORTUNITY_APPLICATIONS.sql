-- Adds a JSONB column to store multiple diligence document URLs per application
ALTER TABLE IF EXISTS public.opportunity_applications
  ADD COLUMN IF NOT EXISTS diligence_urls jsonb DEFAULT '[]'::jsonb;

-- Ensure it's an array
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'opportunity_applications_diligence_urls_is_array'
  ) THEN
    ALTER TABLE IF EXISTS public.opportunity_applications
      ADD CONSTRAINT opportunity_applications_diligence_urls_is_array
      CHECK (jsonb_typeof(diligence_urls) = 'array');
  END IF;
END $$;

-- Index for containment/lookups
CREATE INDEX IF NOT EXISTS idx_opportunity_applications_diligence_urls_gin
  ON public.opportunity_applications
  USING gin (diligence_urls jsonb_path_ops);
