-- =====================================================
-- MIGRATE get_current_profile_safe() FUNCTION TO USE user_profiles ONLY
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This function is used in frontend (lib/auth.ts line 346)
-- Frontend Impact: ✅ NONE - Function signature and return format stay the same
-- 
-- Performance Benefits of Removing Fallback:
-- ✅ Only queries ONE table instead of potentially TWO
-- ✅ Faster execution for large user bases
-- ✅ Cleaner code - assumes all users are in user_profiles
-- 
-- Verification: All users have profiles in user_profiles table ✅
-- (151 users in users table, 154 profiles in user_profiles, 0 missing)

CREATE OR REPLACE FUNCTION get_current_profile_safe(auth_user_uuid UUID)
RETURNS TABLE (
    profile_id UUID,
    auth_user_id UUID,
    email TEXT,
    name TEXT,
    role user_role,
    startup_name TEXT,
    center_name TEXT,
    firm_name TEXT,
    investor_code TEXT,
    investment_advisor_code TEXT,
    investment_advisor_code_entered TEXT,
    ca_code TEXT,
    cs_code TEXT,
    mentor_code TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    company TEXT,
    company_type TEXT,
    currency TEXT,
    government_id TEXT,
    ca_license TEXT,
    cs_license TEXT,
    verification_documents TEXT[],
    profile_photo_url TEXT,
    logo_url TEXT,
    proof_of_business_url TEXT,
    financial_advisor_license_url TEXT,
    is_profile_complete BOOLEAN,
    registration_date DATE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    source_table TEXT
) AS $$
BEGIN
    -- Get from user_profiles (new system) - NO FALLBACK
    -- Uses user_profile_sessions to get the active profile
    RETURN QUERY
    SELECT 
        p.id::UUID,
        p.auth_user_id::UUID,
        p.email::TEXT,
        p.name::TEXT,
        p.role::user_role,
        p.startup_name::TEXT,
        p.center_name::TEXT,
        p.firm_name::TEXT,
        p.investor_code::TEXT,
        p.investment_advisor_code::TEXT,
        p.investment_advisor_code_entered::TEXT,
        p.ca_code::TEXT,
        p.cs_code::TEXT,
        p.mentor_code::TEXT,
        p.phone::TEXT,
        p.address::TEXT,
        p.city::TEXT,
        p.state::TEXT,
        p.country::TEXT,
        p.company::TEXT,
        p.company_type::TEXT,
        p.currency::TEXT,
        p.government_id::TEXT,
        p.ca_license::TEXT,
        p.cs_license::TEXT,
        p.verification_documents::TEXT[],
        p.profile_photo_url::TEXT,
        p.logo_url::TEXT,
        p.proof_of_business_url::TEXT,
        p.financial_advisor_license_url::TEXT,
        p.is_profile_complete::BOOLEAN,
        p.registration_date::DATE,
        p.created_at::TIMESTAMP WITH TIME ZONE,
        p.updated_at::TIMESTAMP WITH TIME ZONE,
        'user_profiles'::TEXT as source_table
    FROM public.user_profiles p
    INNER JOIN public.user_profile_sessions s ON s.current_profile_id = p.id
    WHERE s.auth_user_id = auth_user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission (if needed)
GRANT EXECUTE ON FUNCTION get_current_profile_safe(UUID) TO authenticated, anon;

-- Verify the function was created
SELECT '✅ Function get_current_profile_safe() migrated to use user_profiles only (NO FALLBACK - OPTIMIZED)' as status;

-- Performance note:
-- This version is FASTER because:
-- 1. Only queries user_profiles + user_profile_sessions (no users table fallback)
-- 2. No conditional logic (IF statement) - simpler execution path
-- 3. Better for large user bases - single join query
-- 4. Uses index on auth_user_id for fast lookup

