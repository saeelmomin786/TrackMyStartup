-- Test query to verify getOffersForStartup logic for startup_id = 181
-- This mimics exactly what the getOffersForStartup function does

-- Step 1: Get all offers for startup_id = 181
SELECT 
    io.*,
    s.id as startup_table_id,
    s.name as startup_table_name,
    s.investment_advisor_code as startup_advisor,
    u.id as investor_user_id,
    u.name as investor_name,
    u.investment_advisor_code as investor_advisor
FROM investment_offers io
LEFT JOIN startups s ON io.startup_id = s.id
LEFT JOIN users u ON io.investor_email = u.email
WHERE io.startup_id = 181
ORDER BY io.created_at DESC;

-- Step 2: Apply the visibility filter logic
-- Show offers that should be visible to startup (stage >= 3 OR auto-progressing offers)
SELECT 
    io.id,
    io.startup_id,
    io.startup_name,
    io.investor_email,
    io.stage,
    io.status,
    io.created_at,
    CASE 
        WHEN io.stage >= 3 THEN 'VISIBLE - Stage 3+'
        WHEN io.stage = 1 AND u.investment_advisor_code IS NULL THEN 'VISIBLE - Stage 1, No Investor Advisor'
        WHEN io.stage = 2 AND s.investment_advisor_code IS NULL THEN 'VISIBLE - Stage 2, No Startup Advisor'
        ELSE 'HIDDEN - Waiting for Advisor Approval'
    END as visibility_reason,
    u.investment_advisor_code as investor_advisor,
    s.investment_advisor_code as startup_advisor
FROM investment_offers io
LEFT JOIN users u ON io.investor_email = u.email
LEFT JOIN startups s ON io.startup_id = s.id
WHERE io.startup_id = 181
ORDER BY io.created_at DESC;

