-- =====================================================
-- UPDATE INVESTOR_LIST TABLE FOR MULTI-SELECT FIELDS
-- =====================================================
-- This script updates fund_type, domain, stage, and country columns
-- from TEXT to TEXT[] (array) to support multiple selections

-- Update fund_type column to array
ALTER TABLE IF EXISTS public.investor_list 
ALTER COLUMN fund_type TYPE TEXT[] USING 
  CASE 
    WHEN fund_type IS NULL THEN NULL
    WHEN fund_type = '' THEN NULL
    ELSE ARRAY[fund_type]
  END;

-- Update domain column to array
ALTER TABLE IF EXISTS public.investor_list 
ALTER COLUMN domain TYPE TEXT[] USING 
  CASE 
    WHEN domain IS NULL THEN NULL
    WHEN domain = '' THEN NULL
    ELSE ARRAY[domain]
  END;

-- Update stage column to array
ALTER TABLE IF EXISTS public.investor_list 
ALTER COLUMN stage TYPE TEXT[] USING 
  CASE 
    WHEN stage IS NULL THEN NULL
    WHEN stage = '' THEN NULL
    ELSE ARRAY[stage]
  END;

-- Update country column to array
ALTER TABLE IF EXISTS public.investor_list 
ALTER COLUMN country TYPE TEXT[] USING 
  CASE 
    WHEN country IS NULL THEN NULL
    WHEN country = '' THEN NULL
    ELSE ARRAY[country]
  END;

-- Update indexes to use GIN for array columns (better for array queries)
DROP INDEX IF EXISTS idx_investor_list_fund_type;
DROP INDEX IF EXISTS idx_investor_list_domain;
DROP INDEX IF EXISTS idx_investor_list_stage;
DROP INDEX IF EXISTS idx_investor_list_country;

CREATE INDEX IF NOT EXISTS idx_investor_list_fund_type ON public.investor_list USING GIN(fund_type);
CREATE INDEX IF NOT EXISTS idx_investor_list_domain ON public.investor_list USING GIN(domain);
CREATE INDEX IF NOT EXISTS idx_investor_list_stage ON public.investor_list USING GIN(stage);
CREATE INDEX IF NOT EXISTS idx_investor_list_country ON public.investor_list USING GIN(country);

-- Update comments
COMMENT ON COLUMN public.investor_list.fund_type IS 'Array of fund types (VC, Angel, Corporate, etc.)';
COMMENT ON COLUMN public.investor_list.domain IS 'Array of domains/sectors they invest in';
COMMENT ON COLUMN public.investor_list.stage IS 'Array of investment stages (Pre-Seed, Seed, Series A, etc.)';
COMMENT ON COLUMN public.investor_list.country IS 'Array of countries/regions';


