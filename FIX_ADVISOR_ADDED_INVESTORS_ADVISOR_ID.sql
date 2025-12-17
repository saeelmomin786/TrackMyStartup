-- =====================================================
-- FIX advisor_added_investors.advisor_id
-- =====================================================
-- Update advisor_id from profile ID to auth_user_id (auth.uid())
-- =====================================================

-- 1. Check which records have profile IDs as advisor_id
SELECT 
    'Records with profile IDs' as category,
    aai.id,
    aai.advisor_id as current_advisor_id,
    aai.investor_name,
    up.id as profile_id,
    up.auth_user_id as correct_advisor_id,
    CASE 
        WHEN up.auth_user_id IS NOT NULL THEN '✅ Can be fixed'
        ELSE '❌ No matching profile found'
    END as fix_status
FROM advisor_added_investors aai
LEFT JOIN user_profiles up ON up.id::text = aai.advisor_id::text
WHERE aai.advisor_id NOT IN (
    SELECT id::text FROM users
)
ORDER BY aai.created_at DESC;

-- 2. Update advisor_id from profile ID to auth_user_id
UPDATE advisor_added_investors aai
SET advisor_id = up.auth_user_id::text
FROM user_profiles up
WHERE up.id::text = aai.advisor_id::text
AND up.auth_user_id IS NOT NULL
AND aai.advisor_id NOT IN (
    SELECT id::text FROM users
);

-- 3. Verify the fix
SELECT 
    'Verification: Records after fix' as category,
    COUNT(*) as total_records,
    COUNT(CASE WHEN advisor_id::text IN (SELECT id::text FROM users) THEN 1 END) as records_with_valid_uuid,
    COUNT(CASE WHEN is_on_tms = true AND tms_investor_id IS NOT NULL THEN 1 END) as tms_linked_investors
FROM advisor_added_investors;

-- 4. Show sample of fixed records
SELECT 
    'Sample fixed records' as category,
    id,
    advisor_id,
    investor_name,
    is_on_tms,
    tms_investor_id,
    CASE 
        WHEN advisor_id::text IN (SELECT id::text FROM users) THEN '✅ Valid UUID (auth.uid())'
        ELSE '⚠️ Still needs fix'
    END as status
FROM advisor_added_investors
ORDER BY created_at DESC
LIMIT 10;





