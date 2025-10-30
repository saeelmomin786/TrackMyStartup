-- Test script to verify the getUserInvestmentOffers function logic
-- This will help us understand if the issue is in the database or the application

-- Test the exact query that getUserInvestmentOffers uses
SELECT 
    io.id,
    io.investor_email,
    io.startup_name,
    io.startup_id,
    io.stage,
    io.status,
    io.contact_details_revealed,
    s.id as startup_id_from_join,
    s.name as startup_name_from_join,
    s.user_id,
    s.sector
FROM investment_offers io
LEFT JOIN startups s ON io.startup_id = s.id
WHERE io.investor_email = 'siddhi.solapurkar22@pccoepune.org'
ORDER BY io.created_at DESC;

-- Test the user lookup by user_id
SELECT 
    'User lookup by user_id:' as test_type,
    u.id,
    u.email,
    u.name,
    u.startup_name,
    u.role
FROM users u
WHERE u.id = '478e8624-8229-451a-93f8-e1f261e8ca94';

-- Test the fallback user lookup by startup_name
SELECT 
    'User lookup by startup_name:' as test_type,
    u.id,
    u.email,
    u.name,
    u.startup_name,
    u.role
FROM users u
WHERE u.startup_name = 'MULSETU AGROTECH PRIVATE LIMITED'
AND u.role = 'Startup';

-- Test the complete flow
SELECT 
    'Complete flow test:' as test_type,
    io.id as offer_id,
    io.startup_name,
    s.user_id,
    u.email as startup_user_email,
    u.name as startup_user_name
FROM investment_offers io
LEFT JOIN startups s ON io.startup_id = s.id
LEFT JOIN users u ON s.user_id = u.id
WHERE io.investor_email = 'siddhi.solapurkar22@pccoepune.org'
AND io.id = 55;








