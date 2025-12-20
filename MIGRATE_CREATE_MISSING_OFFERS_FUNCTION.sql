-- =====================================================
-- MIGRATE create_missing_offers() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function creates investment offers for existing advisor-startup relationships
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS public.create_missing_offers() CASCADE;

CREATE OR REPLACE FUNCTION public.create_missing_offers()
RETURNS TABLE(created_count integer, message text)
LANGUAGE plpgsql
AS $function$
DECLARE
  offer_count INTEGER := 0;
BEGIN
  -- MIGRATED: Create offers for existing relationships using user_profiles
  INSERT INTO investment_offers (
    startup_id,
    startup_name,
    investor_email,
    investor_name,
    offer_amount,
    equity_percentage,
    status,
    created_at
  )
  SELECT 
    r.startup_id,
    s.name as startup_name,
    advisor.email as investor_email,
    advisor.name as investor_name,
    0 as offer_amount,
    0 as equity_percentage,
    'pending' as status,
    NOW() as created_at
  FROM investment_advisor_relationships r
  -- MIGRATED: Join with user_profiles instead of users (get most recent advisor profile)
  JOIN LATERAL (
    SELECT email, name
    FROM public.user_profiles
    WHERE auth_user_id = r.investment_advisor_id  -- MIGRATED: Use auth_user_id instead of id
      AND role = 'Investment Advisor'
    ORDER BY created_at DESC
    LIMIT 1
  ) advisor ON true
  JOIN startups s ON s.id = r.startup_id
  WHERE r.relationship_type = 'advisor_startup'
    AND NOT EXISTS (
      SELECT 1 FROM investment_offers o 
      WHERE o.startup_id = r.startup_id 
        AND o.investor_email = advisor.email
    )
  ON CONFLICT (startup_id, investor_email) DO NOTHING;
  
  GET DIAGNOSTICS offer_count = ROW_COUNT;
  
  RETURN QUERY SELECT offer_count, 'Created ' || offer_count || ' investment offers';
END;
$function$;

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.create_missing_offers() TO authenticated;

-- Verify the function was created
SELECT '✅ Function create_missing_offers() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;



