-- Debug script to check offer visibility
-- Run this to see what offers exist and why they might not be visible

-- 1. Check all offers in the database
SELECT 
    io.id,
    io.startup_id,
    io.startup_name,
    io.investor_email,
    io.stage,
    io.status,
    io.created_at,
    u.investment_advisor_code as investor_advisor,
    s.investment_advisor_code as startup_advisor
FROM investment_offers io
LEFT JOIN users u ON io.investor_email = u.email
LEFT JOIN startups s ON io.startup_id = s.id
ORDER BY io.created_at DESC;

-- 2. Check specific offer for MULSETU AGROTECH PRIVATE LIMITED
SELECT 
    io.id,
    io.startup_id,
    io.startup_name,
    io.investor_email,
    io.stage,
    io.status,
    io.created_at,
    u.investment_advisor_code as investor_advisor,
    s.investment_advisor_code as startup_advisor,
    s.id as startup_table_id,
    s.name as startup_table_name
FROM investment_offers io
LEFT JOIN users u ON io.investor_email = u.email
LEFT JOIN startups s ON io.startup_id = s.id
WHERE io.startup_name ILIKE '%MULSETU%' OR s.name ILIKE '%MULSETU%'
ORDER BY io.created_at DESC;

-- 3. Check all startups to find MULSETU
SELECT id, name, sector FROM startups WHERE name ILIKE '%MULSETU%';

-- 4. Check if there are any offers for startup ID that matches MULSETU
-- (Replace X with the actual startup ID from query 3)
-- SELECT * FROM investment_offers WHERE startup_id = X;








