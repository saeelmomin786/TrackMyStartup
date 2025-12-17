-- =====================================================
-- CHECK AND FIX advisor_mandates.advisor_id
-- =====================================================
-- This script checks what advisor_id actually contains
-- and adds the correct FK constraint
-- =====================================================

-- 1. Check advisor_mandates table structure
SELECT 
    'advisor_mandates structure' as category,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'advisor_mandates'
ORDER BY ordinal_position;

-- 2. Check what advisor_id values actually match
SELECT 
    'advisor_id data check' as category,
    COUNT(*) as total_mandates,
    COUNT(DISTINCT am.advisor_id) as unique_advisor_ids,
    COUNT(CASE WHEN u.id IS NOT NULL THEN 1 END) as matches_users_id,
    COUNT(CASE WHEN up.id IS NOT NULL THEN 1 END) as matches_user_profiles_id,
    COUNT(CASE WHEN up.auth_user_id IS NOT NULL THEN 1 END) as matches_auth_user_id,
    COUNT(CASE WHEN u.id IS NULL AND up.id IS NULL THEN 1 END) as no_match_found
FROM advisor_mandates am
LEFT JOIN users u ON u.id = am.advisor_id
LEFT JOIN user_profiles up ON up.id = am.advisor_id
LEFT JOIN user_profiles up2 ON up2.auth_user_id = am.advisor_id;

-- 3. Sample data - show what advisor_id values look like
SELECT 
    'Sample advisor_id values' as category,
    am.id as mandate_id,
    am.advisor_id,
    am.name as mandate_name,
    CASE 
        WHEN u.id IS NOT NULL THEN '✅ Matches users.id'
        WHEN up.id IS NOT NULL THEN '❌ Matches user_profiles.id (profile ID)'
        WHEN up2.auth_user_id IS NOT NULL THEN '✅ Matches user_profiles.auth_user_id'
        ELSE '⚠️ No match found'
    END as match_status,
    u.id as users_id,
    up.id as profile_id,
    up2.auth_user_id as auth_user_id
FROM advisor_mandates am
LEFT JOIN users u ON u.id = am.advisor_id
LEFT JOIN user_profiles up ON up.id = am.advisor_id
LEFT JOIN user_profiles up2 ON up2.auth_user_id = am.advisor_id
ORDER BY am.created_at DESC
LIMIT 10;

-- 4. Check if we should add FK to users.id or user_profiles.auth_user_id
SELECT 
    'FK recommendation' as category,
    CASE 
        WHEN COUNT(CASE WHEN u.id IS NOT NULL THEN 1 END) > 0 
        AND COUNT(CASE WHEN up.id IS NOT NULL THEN 1 END) = 0
        THEN '✅ Add FK to users.id (all advisor_id match users.id)'
        WHEN COUNT(CASE WHEN up2.auth_user_id IS NOT NULL THEN 1 END) > 0
        AND COUNT(CASE WHEN up.id IS NOT NULL THEN 1 END) = 0
        THEN '✅ Add FK to user_profiles.auth_user_id (all match auth_user_id)'
        WHEN COUNT(CASE WHEN up.id IS NOT NULL THEN 1 END) > 0
        THEN '❌ Data issue: Some advisor_id match user_profiles.id (profile IDs) - needs data fix first'
        ELSE '⚠️ Cannot determine - check data manually'
    END as recommendation
FROM advisor_mandates am
LEFT JOIN users u ON u.id = am.advisor_id
LEFT JOIN user_profiles up ON up.id = am.advisor_id
LEFT JOIN user_profiles up2 ON up2.auth_user_id = am.advisor_id;

-- 5. If data is correct, add FK constraint to users.id
-- UNCOMMENT THIS SECTION AFTER VERIFYING DATA IS CORRECT
/*
-- First, check if there are any invalid advisor_id values
SELECT 
    'Invalid advisor_id values (will fail FK constraint)' as category,
    am.id,
    am.advisor_id,
    am.name
FROM advisor_mandates am
LEFT JOIN users u ON u.id = am.advisor_id
WHERE u.id IS NULL
AND am.advisor_id IS NOT NULL;

-- If no invalid values found, add the FK constraint:
ALTER TABLE public.advisor_mandates
ADD CONSTRAINT fk_advisor_mandates_advisor_id 
FOREIGN KEY (advisor_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;
*/





