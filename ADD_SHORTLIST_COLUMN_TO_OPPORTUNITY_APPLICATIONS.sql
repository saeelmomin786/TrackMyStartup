-- =====================================================
-- ADD SHORTLIST COLUMN TO OPPORTUNITY APPLICATIONS
-- =====================================================
-- Run this in Supabase SQL Editor

-- 1. Add is_shortlisted column
ALTER TABLE public.opportunity_applications 
ADD COLUMN IF NOT EXISTS is_shortlisted BOOLEAN DEFAULT FALSE;

-- 2. Add comment to document the column
COMMENT ON COLUMN public.opportunity_applications.is_shortlisted 
IS 'Indicates if the application has been shortlisted by the facilitator for priority review. 
This is a marking/flagging system that does not affect the application status.
Gets cleared automatically when application is approved.';

-- 3. Create index for performance (only index TRUE values for efficiency)
CREATE INDEX IF NOT EXISTS idx_opportunity_applications_shortlisted 
  ON public.opportunity_applications(is_shortlisted) 
  WHERE is_shortlisted = TRUE;

-- 4. Create index on opportunity_id + shortlisted for filtering
CREATE INDEX IF NOT EXISTS idx_opportunity_applications_opp_shortlisted 
  ON public.opportunity_applications(opportunity_id, is_shortlisted) 
  WHERE is_shortlisted = TRUE;

-- 5. Verify the column was added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'opportunity_applications'
  AND column_name = 'is_shortlisted';

-- 6. Check if any RLS policies need updating (optional - current policies should work)
-- The existing RLS policies on opportunity_applications should automatically cover this column

-- 7. Show sample data structure
SELECT 
  id,
  startup_id,
  opportunity_id,
  status,
  is_shortlisted,
  created_at
FROM public.opportunity_applications
LIMIT 5;

-- 8. Summary
SELECT 
  '✅ COLUMN ADDED SUCCESSFULLY' as status,
  COUNT(*) as total_applications,
  COUNT(CASE WHEN is_shortlisted = TRUE THEN 1 END) as shortlisted_count,
  COUNT(CASE WHEN is_shortlisted = FALSE THEN 1 END) as not_shortlisted_count
FROM public.opportunity_applications;

-- =====================================================
-- OPTIONAL: Future Enhancement Queries
-- =====================================================

-- Query to get shortlisted applications for a specific facilitator
-- (Uncomment to test)
-- SELECT 
--   oa.id,
--   s.name as startup_name,
--   io.program_name,
--   oa.status,
--   oa.is_shortlisted,
--   oa.created_at
-- FROM public.opportunity_applications oa
-- JOIN public.startups s ON oa.startup_id = s.id
-- JOIN public.incubation_opportunities io ON oa.opportunity_id = io.id
-- WHERE oa.is_shortlisted = TRUE
--   AND io.facilitator_id = 'YOUR_FACILITATOR_ID'
-- ORDER BY oa.created_at DESC;

-- Query to get shortlist statistics per opportunity
-- (Uncomment to test)
-- SELECT 
--   io.program_name,
--   COUNT(*) as total_applications,
--   COUNT(CASE WHEN oa.is_shortlisted = TRUE THEN 1 END) as shortlisted,
--   COUNT(CASE WHEN oa.status = 'pending' AND oa.is_shortlisted = TRUE THEN 1 END) as shortlisted_pending
-- FROM public.opportunity_applications oa
-- JOIN public.incubation_opportunities io ON oa.opportunity_id = io.id
-- GROUP BY io.program_name
-- ORDER BY shortlisted DESC;

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- Uncomment only if you need to remove the column

-- DROP INDEX IF EXISTS idx_opportunity_applications_shortlisted;
-- DROP INDEX IF EXISTS idx_opportunity_applications_opp_shortlisted;
-- ALTER TABLE public.opportunity_applications DROP COLUMN IF EXISTS is_shortlisted;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
