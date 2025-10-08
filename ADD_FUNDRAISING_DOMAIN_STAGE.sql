-- Add domain and stage columns to fundraising_details
-- Domain options mirror the UI dropdown

ALTER TABLE IF EXISTS fundraising_details
ADD COLUMN IF NOT EXISTS domain TEXT;

ALTER TABLE IF EXISTS fundraising_details
ADD COLUMN IF NOT EXISTS stage TEXT;

-- Optional: add CHECK constraints to keep values within expected sets
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fundraising_details_domain_check'
  ) THEN
    ALTER TABLE fundraising_details
    ADD CONSTRAINT fundraising_details_domain_check CHECK (domain IS NULL OR domain IN (
      'Agriculture','AI','Climate','Consumer Goods','Defence','E-commerce','Education','EV','Finance','Food & Beverage','Healthcare','Manufacturing','Media & Entertainment','Others','PaaS','Renewable Energy','Retail','SaaS','Social Impact','Space','Transportation and Logistics','Waste Management','Web 3.0'
    ));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fundraising_details_stage_check'
  ) THEN
    ALTER TABLE fundraising_details
    ADD CONSTRAINT fundraising_details_stage_check CHECK (stage IS NULL OR stage IN (
      'Ideation','Proof of Concept','Minimum viable product','Product market fit','Scaling'
    ));
  END IF;
END $$;

-- Backfill existing rows with NULLs explicitly (no-op but documents intent)
UPDATE fundraising_details SET domain = domain, stage = stage;


