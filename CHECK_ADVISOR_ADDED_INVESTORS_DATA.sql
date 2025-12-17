-- =====================================================
-- CHECK ADVISOR ADDED INVESTORS DATA
-- =====================================================
-- Check if there's any data and what format advisor_id is in
-- =====================================================

-- 1. Check ALL advisor_added_investors (no filter)
SELECT 
    'All advisor_added_investors' as category,
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_on_tms = true THEN 1 END) as tms_linked_count,
    COUNT(CASE WHEN is_on_tms = true AND tms_investor_id IS NOT NULL THEN 1 END) as tms_with_id_count
FROM advisor_added_investors;

-- 2. Check advisor_id format and sample data
SELECT 
    'Sample advisor_added_investors' as category,
    id,
    advisor_id,
    investor_name,
    email,
    is_on_tms,
    tms_investor_id,
    CASE 
        WHEN advisor_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN '✅ UUID format (likely auth.uid())'
        ELSE '⚠️ Not UUID format (might be profile ID)'
    END as advisor_id_format,
    created_at
FROM advisor_added_investors
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if advisor_id matches any users (as UUID)
SELECT 
    'Advisor ID matching users (UUID)' as category,
    aai.advisor_id,
    aai.investor_name,
    CASE 
        WHEN u.id IS NOT NULL THEN '✅ Matches user'
        ELSE '❌ No matching user'
    END as match_status,
    u.id as user_id,
    u.name as user_name,
    u.role as user_role
FROM advisor_added_investors aai
LEFT JOIN users u ON u.id::text = aai.advisor_id::text
ORDER BY aai.created_at DESC
LIMIT 10;

-- 4. Check if advisor_id matches any user_profiles (as profile ID)
SELECT 
    'Advisor ID matching user_profiles (Profile ID)' as category,
    aai.advisor_id,
    aai.investor_name,
    CASE 
        WHEN up.id IS NOT NULL THEN '✅ Matches profile'
        ELSE '❌ No matching profile'
    END as match_status,
    up.id as profile_id,
    up.name as profile_name,
    up.role as profile_role,
    up.auth_user_id
FROM advisor_added_investors aai
LEFT JOIN user_profiles up ON up.id::text = aai.advisor_id::text
ORDER BY aai.created_at DESC
LIMIT 10;

-- 5. Check RLS policies on advisor_added_investors
SELECT 
    'RLS Policies' as category,
    policyname,
    cmd,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'advisor_added_investors'
ORDER BY policyname;





