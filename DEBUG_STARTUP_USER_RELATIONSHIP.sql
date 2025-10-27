-- Debug query to check the relationship between startups and users
-- This will help us understand why startup_user is not being fetched

-- First, let's check the offer data structure
SELECT 
    io.id,
    io.startup_id,
    io.startup_name,
    io.investor_email,
    io.stage,
    io.status,
    io.contact_details_revealed
FROM investment_offers io
WHERE io.id = 55;

-- Check the startup data
SELECT 
    s.id,
    s.name,
    s.user_id,
    s.sector
FROM startups s
WHERE s.id = 181;

-- Check the user data for this startup
SELECT 
    u.id,
    u.email,
    u.name,
    u.startup_name,
    u.role
FROM users u
WHERE u.startup_name = 'MULSETU AGROTECH PRIVATE LIMITED'
OR u.id = (SELECT user_id FROM startups WHERE id = 181);

-- Test the join that should work
SELECT 
    io.id as offer_id,
    io.startup_id,
    io.startup_name,
    s.id as startup_id_from_join,
    s.name as startup_name_from_join,
    s.user_id,
    u.id as user_id_from_join,
    u.email as user_email,
    u.name as user_name
FROM investment_offers io
LEFT JOIN startups s ON io.startup_id = s.id
LEFT JOIN users u ON s.user_id = u.id
WHERE io.id = 55;