-- ADD_BUSINESS_PLAN_AND_URLS_TO_FUNDRAISING.sql
-- This script adds business_plan_url, website_url, and linkedin_url columns to the fundraising_details table
--
-- SAFETY NOTES:
-- 1. Uses "IF NOT EXISTS" - safe to run multiple times, won't fail if columns already exist
-- 2. Columns are nullable (TEXT without NOT NULL) - won't break existing data or require defaults
-- 3. Won't affect existing triggers (update_fundraising_details_updated_at only touches updated_at)
-- 4. Won't affect existing indexes (no new indexes needed for these columns)
-- 5. Won't break existing RLS policies (they work on row-level, not column-level)
-- 6. The public view (fundraising_details_public) explicitly lists columns, so it won't include these new columns
--    (This is intentional - these fields are not meant to be public)
--
-- IMPACT: 
-- - No breaking changes to existing functions, views, or triggers
-- - Existing queries using SELECT * will automatically include new columns
-- - Frontend code already updated to handle these fields

-- Add business_plan_url column
ALTER TABLE fundraising_details 
ADD COLUMN IF NOT EXISTS business_plan_url TEXT;

-- Add website_url column
ALTER TABLE fundraising_details 
ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Add linkedin_url column
ALTER TABLE fundraising_details 
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Verify the columns were added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'fundraising_details'
    AND column_name IN ('business_plan_url', 'website_url', 'linkedin_url')
ORDER BY ordinal_position;

