-- Manually reveal contact details for the existing accepted offer (ID 55)
-- This is for the MULSETU AGROTECH offer that was already accepted

-- First, check the current status
SELECT 
    id,
    startup_id,
    investor_email,
    stage,
    status,
    contact_details_revealed,
    contact_details_revealed_at
FROM investment_offers 
WHERE id = 55;

-- Check if neither party has an advisor
SELECT 
    'Investor has advisor' as check_type,
    CASE WHEN u.investment_advisor_code IS NOT NULL THEN 'YES' ELSE 'NO' END as result
FROM users u 
WHERE u.email = (SELECT investor_email FROM investment_offers WHERE id = 55)

UNION ALL

SELECT 
    'Startup has advisor' as check_type,
    CASE WHEN u.investment_advisor_code IS NOT NULL THEN 'YES' ELSE 'NO' END as result
FROM startups s 
JOIN users u ON s.user_id = u.id 
WHERE s.id = (SELECT startup_id FROM investment_offers WHERE id = 55);

-- Update the offer to reveal contact details (since neither has advisor)
UPDATE investment_offers 
SET 
    contact_details_revealed = TRUE,
    contact_details_revealed_at = NOW(),
    updated_at = NOW()
WHERE id = 55;

-- Verify the update
SELECT 
    id,
    startup_id,
    investor_email,
    stage,
    status,
    contact_details_revealed,
    contact_details_revealed_at,
    updated_at
FROM investment_offers 
WHERE id = 55;

