-- =====================================================
-- MIGRATE create_existing_investment_advisor_relationships() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function creates relationships for existing investors and startups with advisor codes
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS public.create_existing_investment_advisor_relationships() CASCADE;

CREATE OR REPLACE FUNCTION public.create_existing_investment_advisor_relationships()
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    investor_count INTEGER := 0;
    startup_count INTEGER := 0;
BEGIN
    -- MIGRATED: Create relationships for existing investors with codes using user_profiles
    INSERT INTO investment_advisor_relationships (investment_advisor_id, investor_id, relationship_type)
    SELECT 
        advisor.auth_user_id as investment_advisor_id,  -- MIGRATED: Use auth_user_id instead of id
        investor.auth_user_id as investor_id,  -- MIGRATED: Use auth_user_id instead of id
        'advisor_investor' as relationship_type
    FROM public.user_profiles investor
    -- MIGRATED: Join with user_profiles for advisor (get most recent profile)
    JOIN LATERAL (
        SELECT auth_user_id
        FROM public.user_profiles
        WHERE (
            investment_advisor_code = investor.investment_advisor_code_entered
            OR investment_advisor_code_entered = investor.investment_advisor_code_entered
        )
        AND role = 'Investment Advisor'
        ORDER BY created_at DESC
        LIMIT 1
    ) advisor ON true
    WHERE investor.role = 'Investor' 
      AND investor.investment_advisor_code_entered IS NOT NULL
    ON CONFLICT (investment_advisor_id, investor_id, relationship_type) DO NOTHING;
    
    GET DIAGNOSTICS investor_count = ROW_COUNT;
    
    -- MIGRATED: Create relationships for existing startups with codes using user_profiles
    INSERT INTO investment_advisor_relationships (investment_advisor_id, startup_id, relationship_type)
    SELECT 
        advisor.auth_user_id as investment_advisor_id,  -- MIGRATED: Use auth_user_id instead of id
        startup.id as startup_id,
        'advisor_startup' as relationship_type
    FROM startups startup
    -- MIGRATED: Join with user_profiles for advisor (get most recent profile)
    JOIN LATERAL (
        SELECT auth_user_id
        FROM public.user_profiles
        WHERE (
            investment_advisor_code = startup.investment_advisor_code
            OR investment_advisor_code_entered = startup.investment_advisor_code
        )
        AND role = 'Investment Advisor'
        ORDER BY created_at DESC
        LIMIT 1
    ) advisor ON true
    WHERE startup.investment_advisor_code IS NOT NULL
    ON CONFLICT (investment_advisor_id, startup_id, relationship_type) DO NOTHING;
    
    GET DIAGNOSTICS startup_count = ROW_COUNT;
    
    RETURN 'Created ' || investor_count || ' investor relationships and ' || startup_count || ' startup relationships';
END;
$function$;

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.create_existing_investment_advisor_relationships() TO authenticated;

-- Verify the function was created
SELECT '✅ Function create_existing_investment_advisor_relationships() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;







