-- =====================================================
-- AUTO-LINK TMS INVESTORS TO advisor_added_investors
-- =====================================================
-- Link investors who are on TMS and match advisor_added_investors by email
-- =====================================================

-- 1. Find matches that should be linked
SELECT 
    'Investors to be linked' as category,
    aai.id as advisor_added_investor_id,
    aai.investor_name,
    aai.email,
    u.id as tms_investor_id,
    u.name as tms_investor_name,
    u.email as tms_investor_email,
    CASE 
        WHEN aai.is_on_tms = true AND aai.tms_investor_id IS NOT NULL THEN '✅ Already linked'
        WHEN u.id IS NOT NULL AND u.role = 'Investor' THEN '⚠️ Should be linked'
        ELSE '❌ No match'
    END as status
FROM advisor_added_investors aai
LEFT JOIN users u ON LOWER(TRIM(u.email)) = LOWER(TRIM(aai.email))
WHERE u.role = 'Investor'
AND (aai.is_on_tms = false OR aai.tms_investor_id IS NULL)
ORDER BY aai.created_at DESC;

-- 2. Auto-link investors who match by email
UPDATE advisor_added_investors aai
SET 
    is_on_tms = true,
    tms_investor_id = u.id::text
FROM users u
WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(aai.email))
AND u.role = 'Investor'
AND (aai.is_on_tms = false OR aai.tms_investor_id IS NULL);

-- 3. Verify the links
SELECT 
    'Verification: Linked investors' as category,
    COUNT(*) as total_linked,
    COUNT(CASE WHEN u.id IS NOT NULL THEN 1 END) as tms_investors_found
FROM advisor_added_investors aai
LEFT JOIN users u ON u.id::text = aai.tms_investor_id::text
WHERE aai.is_on_tms = true
AND aai.tms_investor_id IS NOT NULL;

-- 4. Show linked investors
SELECT 
    'Linked TMS investors' as category,
    aai.id,
    aai.investor_name,
    aai.email,
    aai.tms_investor_id,
    u.id as user_id,
    u.name as user_name,
    u.role as user_role
FROM advisor_added_investors aai
LEFT JOIN users u ON u.id::text = aai.tms_investor_id::text
WHERE aai.is_on_tms = true
AND aai.tms_investor_id IS NOT NULL
ORDER BY aai.created_at DESC;





