-- =====================================================
-- COMPLETE DIAGNOSIS: Why My Investors Not Showing
-- =====================================================

-- Step 1: Check if there are ANY records at all
SELECT 
    'Step 1: Total records' as step,
    COUNT(*) as total_records
FROM advisor_added_investors;

-- Step 2: Check advisor_id format
SELECT 
    'Step 2: Advisor ID format check' as step,
    advisor_id,
    CASE 
        WHEN advisor_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN '✅ UUID format'
        ELSE '⚠️ Not UUID format'
    END as format,
    COUNT(*) as count
FROM advisor_added_investors
GROUP BY advisor_id
ORDER BY count DESC
LIMIT 5;

-- Step 3: Check if advisor_id matches users (UUID)
SELECT 
    'Step 3: Advisor ID matches users?' as step,
    aai.advisor_id,
    CASE 
        WHEN u.id IS NOT NULL THEN '✅ Matches users.id (auth.uid())'
        ELSE '❌ Does NOT match users.id'
    END as match_status,
    u.role as user_role,
    COUNT(*) as record_count
FROM advisor_added_investors aai
LEFT JOIN users u ON u.id::text = aai.advisor_id::text
GROUP BY aai.advisor_id, u.id, u.role
ORDER BY record_count DESC
LIMIT 5;

-- Step 4: Check if advisor_id matches user_profiles (Profile ID)
SELECT 
    'Step 4: Advisor ID matches user_profiles?' as step,
    aai.advisor_id,
    CASE 
        WHEN up.id IS NOT NULL THEN '✅ Matches profile ID (needs fix!)'
        ELSE '❌ Does NOT match profile ID'
    END as match_status,
    up.auth_user_id as correct_auth_uid,
    COUNT(*) as record_count
FROM advisor_added_investors aai
LEFT JOIN user_profiles up ON up.id::text = aai.advisor_id::text
GROUP BY aai.advisor_id, up.id, up.auth_user_id
ORDER BY record_count DESC
LIMIT 5;

-- Step 5: Check TMS-linked investors
SELECT 
    'Step 5: TMS-linked investors' as step,
    COUNT(*) as total_tms_linked,
    COUNT(CASE WHEN u.id IS NOT NULL THEN 1 END) as tms_investors_found_in_users
FROM advisor_added_investors aai
LEFT JOIN users u ON u.id::text = aai.tms_investor_id::text
WHERE aai.is_on_tms = true
AND aai.tms_investor_id IS NOT NULL;

-- Step 6: Summary - What needs to be fixed?
SELECT 
    'Step 6: Summary - What needs fixing?' as step,
    COUNT(*) as total_records,
    COUNT(CASE WHEN u.id IS NOT NULL THEN 1 END) as records_with_valid_advisor_id,
    COUNT(CASE WHEN up.id IS NOT NULL AND u.id IS NULL THEN 1 END) as records_with_profile_id_needs_fix,
    COUNT(CASE WHEN aai.is_on_tms = true AND aai.tms_investor_id IS NOT NULL THEN 1 END) as tms_linked_investors
FROM advisor_added_investors aai
LEFT JOIN users u ON u.id::text = aai.advisor_id::text
LEFT JOIN user_profiles up ON up.id::text = aai.advisor_id::text;



