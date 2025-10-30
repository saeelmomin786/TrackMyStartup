-- Check specific offer for MULSETU AGROTECH PRIVATE LIMITED (startup_id = 181)
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
WHERE io.startup_id = 181 OR s.id = 181
ORDER BY io.created_at DESC;

-- Also check if there are any offers with startup_name matching MULSETU
SELECT 
    io.id,
    io.startup_id,
    io.startup_name,
    io.investor_email,
    io.stage,
    io.status,
    io.created_at
FROM investment_offers io
WHERE io.startup_name ILIKE '%MULSETU%'
ORDER BY io.created_at DESC;








