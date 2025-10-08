-- Rename column sector -> domain in opportunity_applications

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'opportunity_applications' AND column_name = 'sector'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'opportunity_applications' AND column_name = 'domain'
  ) THEN
    ALTER TABLE public.opportunity_applications RENAME COLUMN sector TO domain;
  END IF;
END $$;

-- Optional: index for domain filtering/search
CREATE INDEX IF NOT EXISTS idx_opportunity_applications_domain ON public.opportunity_applications(domain);


