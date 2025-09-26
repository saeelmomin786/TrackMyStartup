-- FIX_INVESTOR_NAME_AND_TEST.sql
-- Fix the investor name and test fundraising visibility

-- 1. Fix the investor name (it's currently "DELETE" which is wrong)
UPDATE users 
SET name = 'Olympiad Investor'
WHERE email = 'olympiad_info1@startupnationindia.com' 
    AND name = 'DELETE';

-- 2. Verify the name fix
SELECT '=== INVESTOR NAME FIXED ===' as info;
SELECT 
    id,
    email,
    name,
    role,
    investor_code
FROM users 
WHERE email = 'olympiad_info1@startupnationindia.com';

-- 3. Test the fundraising data that should be visible to investors
SELECT '=== FUNDRAISING DATA FOR INVESTORS ===' as info;
SELECT 
    fd.id as fundraising_id,
    fd.startup_id,
    fd.active,
    fd.type,
    fd.value,
    fd.equity,
    s.name as startup_name,
    s.sector,
    s.compliance_status,
    fd.pitch_deck_url,
    fd.pitch_video_url
FROM fundraising_details fd
LEFT JOIN startups s ON fd.startup_id = s.id
WHERE fd.active = true
ORDER BY fd.created_at DESC;

-- 4. Test the investor service query (this is what the frontend calls)
SELECT '=== INVESTOR SERVICE QUERY TEST ===' as info;
SELECT 
    fd.id,
    fd.startup_id,
    fd.active,
    fd.type,
    fd.value,
    fd.equity,
    fd.validation_requested,
    fd.pitch_deck_url,
    fd.pitch_video_url,
    s.id as startup_id_from_join,
    s.name as startup_name,
    s.sector,
    s.compliance_status,
    s.startup_nation_validated,
    s.validation_date,
    s.created_at as startup_created_at
FROM fundraising_details fd
LEFT JOIN startups s ON fd.startup_id = s.id
WHERE fd.active = true
ORDER BY fd.created_at DESC;

-- 5. Check if there are any investment offers for this investor
SELECT '=== INVESTMENT OFFERS FOR THIS INVESTOR ===' as info;
SELECT 
    io.id,
    io.investor_email,
    io.startup_name,
    io.investment_id,
    io.offer_amount,
    io.equity_percentage,
    io.status,
    io.created_at
FROM investment_offers io
WHERE io.investor_email = 'olympiad_info1@startupnationindia.com'
ORDER BY io.created_at DESC;
<<<<<<< HEAD

=======
>>>>>>> aba79bbb99c116b96581e88ab62621652ed6a6b7
