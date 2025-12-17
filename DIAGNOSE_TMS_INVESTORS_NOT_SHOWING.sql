-- =====================================================
-- DIAGNOSE WHY TMS INVESTORS ARE NOT SHOWING
-- =====================================================
-- Check if advisor_added_investors has TMS investors linked
-- =====================================================

-- 1. Check advisor_added_investors with TMS links
SELECT 
    'Advisor Added Investors with TMS links' as category,
    aai.id,
    aai.advisor_id,
    aai.investor_name,
    aai.email,
    aai.is_on_tms,
    aai.tms_investor_id,
    CASE 
        WHEN u.id IS NOT NULL THEN '✅ TMS investor found in users table'
        ELSE '❌ TMS investor NOT found in users table'
    END as tms_investor_status,
    u.id as user_id,
    u.name as user_name,
    u.email as user_email,
    u.role as user_role
FROM advisor_added_investors aai
LEFT JOIN users u ON u.id::text = aai.tms_investor_id::text
WHERE aai.is_on_tms = true
AND aai.tms_investor_id IS NOT NULL
ORDER BY aai.created_at DESC;

-- 2. Check if advisor_id matches auth.uid() format
SELECT 
    'Advisor ID format check' as category,
    advisor_id,
    CASE 
        WHEN advisor_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN '✅ UUID format'
        ELSE '⚠️ Not UUID format (might be profile ID)'
    END as id_format,
    COUNT(*) as investor_count
FROM advisor_added_investors
GROUP BY advisor_id
ORDER BY investor_count DESC
LIMIT 10;

-- 3. Check TMS investor ID format
SELECT 
    'TMS Investor ID format check' as category,
    tms_investor_id,
    CASE 
        WHEN tms_investor_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN '✅ UUID format'
        ELSE '⚠️ Not UUID format'
    END as id_format,
    COUNT(*) as count
FROM advisor_added_investors
WHERE is_on_tms = true
AND tms_investor_id IS NOT NULL
GROUP BY tms_investor_id
ORDER BY count DESC;

-- 4. Summary: How many TMS investors should be showing?
SELECT 
    'Summary' as category,
    COUNT(*) as total_advisor_added_investors,
    COUNT(CASE WHEN is_on_tms = true AND tms_investor_id IS NOT NULL THEN 1 END) as tms_linked_investors,
    COUNT(CASE WHEN is_on_tms = true AND tms_investor_id IS NOT NULL AND u.id IS NOT NULL THEN 1 END) as tms_investors_found_in_users
FROM advisor_added_investors aai
LEFT JOIN users u ON u.id::text = aai.tms_investor_id::text
WHERE aai.advisor_id::text IN (
    SELECT id::text FROM users WHERE role = 'Investment Advisor' LIMIT 5
);

