-- Manual fix for stuck offers - CORRECTED VERSION
-- This script will check all offers and move them to the correct stage based on advisor status
-- Uses correct offer_status enum values: 'pending', 'approved', 'rejected'

-- 1. Find all offers stuck at Stage 1
SELECT 
    io.id,
    io.startup_id,
    io.investor_email,
    io.stage,
    io.status,
    u.investment_advisor_code as investor_advisor,
    s.investment_advisor_code as startup_advisor
FROM investment_offers io
LEFT JOIN users u ON io.investor_email = u.email
LEFT JOIN startups s ON io.startup_id = s.id
WHERE io.stage = 1
ORDER BY io.created_at DESC;

-- 2. Update offers where investor has no advisor (should move to Stage 2 or 3)
UPDATE investment_offers 
SET 
    stage = CASE 
        WHEN s.investment_advisor_code IS NOT NULL THEN 2
        ELSE 3
    END,
    status = 'pending'::offer_status,
    updated_at = NOW()
FROM startups s
WHERE investment_offers.startup_id = s.id
AND investment_offers.stage = 1
AND NOT EXISTS (
    SELECT 1 FROM users u 
    WHERE u.email = investment_offers.investor_email 
    AND u.investment_advisor_code IS NOT NULL
);

-- 3. Update offers where startup has no advisor (should move to Stage 3)
UPDATE investment_offers 
SET 
    stage = 3,
    status = 'pending'::offer_status,
    updated_at = NOW()
FROM startups s
WHERE investment_offers.startup_id = s.id
AND investment_offers.stage = 2
AND s.investment_advisor_code IS NULL;

-- 4. Show updated results
SELECT 
    io.id,
    io.startup_id,
    io.investor_email,
    io.stage,
    io.status,
    u.investment_advisor_code as investor_advisor,
    s.investment_advisor_code as startup_advisor,
    io.updated_at
FROM investment_offers io
LEFT JOIN users u ON io.investor_email = u.email
LEFT JOIN startups s ON io.startup_id = s.id
WHERE io.stage IN (1, 2, 3)
ORDER BY io.created_at DESC;








