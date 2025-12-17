-- =====================================================
-- FIND MISSING TMS INVESTOR LINKS
-- =====================================================
-- Check which investors should be linked but aren't
-- =====================================================

-- 1. Check advisor_added_investors that might match TMS investors by email
SELECT 
    'Potential TMS investor matches by email' as category,
    aai.id,
    aai.investor_name,
    aai.email,
    aai.is_on_tms,
    aai.tms_investor_id,
    u.id as tms_user_id,
    u.name as tms_user_name,
    u.role as tms_user_role,
    CASE 
        WHEN u.id IS NOT NULL AND u.role = 'Investor' THEN '✅ Should be linked!'
        ELSE '❌ No match or not an investor'
    END as link_status
FROM advisor_added_investors aai
LEFT JOIN users u ON LOWER(TRIM(u.email)) = LOWER(TRIM(aai.email))
WHERE aai.is_on_tms = false
OR aai.tms_investor_id IS NULL
ORDER BY aai.created_at DESC;

-- 2. Check investors in users table who entered this advisor's code
-- Replace 'YOUR_ADVISOR_CODE' with actual advisor code when testing
SELECT 
    'Investors who entered advisor code' as category,
    u.id,
    u.name,
    u.email,
    u.role,
    (u as any).investment_advisor_code_entered,
    (u as any).advisor_accepted,
    CASE 
        WHEN aai.id IS NOT NULL THEN '✅ Already in advisor_added_investors'
        ELSE '❌ NOT in advisor_added_investors'
    END as in_advisor_added_investors,
    aai.id as advisor_added_investor_id,
    aai.is_on_tms,
    aai.tms_investor_id
FROM users u
LEFT JOIN advisor_added_investors aai ON aai.tms_investor_id::text = u.id::text
WHERE u.role = 'Investor'
AND (u as any).investment_advisor_code_entered IS NOT NULL
ORDER BY u.created_at DESC
LIMIT 10;

-- 3. Check if there are investors who should be auto-linked
SELECT 
    'Investors who should be auto-linked' as category,
    u.id as investor_id,
    u.name as investor_name,
    u.email as investor_email,
    aai.id as advisor_added_investor_id,
    aai.investor_name as added_investor_name,
    aai.email as added_investor_email,
    CASE 
        WHEN aai.id IS NOT NULL AND (aai.is_on_tms = false OR aai.tms_investor_id IS NULL) THEN '⚠️ Needs linking'
        WHEN aai.id IS NOT NULL AND aai.is_on_tms = true AND aai.tms_investor_id IS NOT NULL THEN '✅ Already linked'
        ELSE '❌ Not in advisor_added_investors'
    END as link_status
FROM users u
LEFT JOIN advisor_added_investors aai ON LOWER(TRIM(aai.email)) = LOWER(TRIM(u.email))
WHERE u.role = 'Investor'
AND EXISTS (
    SELECT 1 FROM advisor_added_investors aai2
    WHERE LOWER(TRIM(aai2.email)) = LOWER(TRIM(u.email))
)
ORDER BY u.created_at DESC
LIMIT 10;




