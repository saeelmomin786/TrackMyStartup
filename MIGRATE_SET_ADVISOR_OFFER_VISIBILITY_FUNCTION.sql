-- =====================================================
-- MIGRATE set_advisor_offer_visibility() TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function sets visibility for investment advisors on offers
-- Frontend Impact: ✅ Check if function is used - if used, signature stays same
-- 
-- Migration: Replace ALL `users` table references with `user_profiles`
-- NO FALLBACKS - Only queries user_profiles table

DROP FUNCTION IF EXISTS public.set_advisor_offer_visibility(integer, uuid, integer) CASCADE;

CREATE OR REPLACE FUNCTION public.set_advisor_offer_visibility(
    p_offer_id integer, 
    p_investor_id uuid, 
    p_startup_id integer
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    v_investor_advisor_id UUID;
    v_startup_advisor_id UUID;
    v_investor_advisor_code TEXT;
    v_startup_advisor_code TEXT;
BEGIN
    -- MIGRATED: Get investor's advisor code from user_profiles (most recent profile)
    SELECT COALESCE(up.investment_advisor_code_entered, up.investment_advisor_code) 
    INTO v_investor_advisor_code
    FROM public.user_profiles up
    WHERE up.auth_user_id = p_investor_id 
    AND up.role = 'Investor'
    AND (up.investment_advisor_code_entered IS NOT NULL OR up.investment_advisor_code IS NOT NULL)
    ORDER BY up.created_at DESC
    LIMIT 1;
    
    -- MIGRATED: Get startup owner's advisor code from user_profiles (most recent profile)
    SELECT COALESCE(up.investment_advisor_code_entered, up.investment_advisor_code)
    INTO v_startup_advisor_code
    FROM public.startups s
    JOIN public.user_profiles up ON s.user_id = up.auth_user_id AND up.role = 'Startup'
    WHERE s.id = p_startup_id 
    AND (up.investment_advisor_code_entered IS NOT NULL OR up.investment_advisor_code IS NOT NULL)
    ORDER BY up.created_at DESC
    LIMIT 1;
    
    -- MIGRATED: Find advisor's auth_user_id from user_profiles using the code
    IF v_investor_advisor_code IS NOT NULL THEN
        SELECT up.auth_user_id INTO v_investor_advisor_id
        FROM public.user_profiles up
        WHERE up.role = 'Investment Advisor'
        AND (
            up.investment_advisor_code = v_investor_advisor_code
            OR up.investment_advisor_code_entered = v_investor_advisor_code
        )
        ORDER BY up.created_at DESC
        LIMIT 1;
    END IF;
    
    -- MIGRATED: Find startup advisor's auth_user_id from user_profiles using the code
    IF v_startup_advisor_code IS NOT NULL THEN
        SELECT up.auth_user_id INTO v_startup_advisor_id
        FROM public.user_profiles up
        WHERE up.role = 'Investment Advisor'
        AND (
            up.investment_advisor_code = v_startup_advisor_code
            OR up.investment_advisor_code_entered = v_startup_advisor_code
        )
        ORDER BY up.created_at DESC
        LIMIT 1;
    END IF;
    
    -- Set visibility for investor's advisor
    IF v_investor_advisor_id IS NOT NULL THEN
        INSERT INTO public.investment_advisor_offer_visibility (offer_id, advisor_id, visibility_reason)
        VALUES (p_offer_id, v_investor_advisor_id, 'investor_advisor')
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- Set visibility for startup's advisor
    IF v_startup_advisor_id IS NOT NULL THEN
        INSERT INTO public.investment_advisor_offer_visibility (offer_id, advisor_id, visibility_reason)
        VALUES (p_offer_id, v_startup_advisor_id, 'startup_advisor')
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- If both have the same advisor, update the reason
    IF v_investor_advisor_id = v_startup_advisor_id AND v_investor_advisor_id IS NOT NULL THEN
        UPDATE public.investment_advisor_offer_visibility 
        SET visibility_reason = 'both_advisor'
        WHERE offer_id = p_offer_id AND advisor_id = v_investor_advisor_id;
    END IF;
END;
$function$;

-- Grant execute permission (if needed)
-- GRANT EXECUTE ON FUNCTION public.set_advisor_offer_visibility(integer, uuid, integer) TO authenticated;

-- Verify the function was created
SELECT '✅ Function set_advisor_offer_visibility() migrated to use user_profiles (NO FALLBACK - OPTIMIZED)' as status;


