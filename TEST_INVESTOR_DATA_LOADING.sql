-- TEST_INVESTOR_DATA_LOADING.sql
-- Test the data loading that the investor view needs

-- 1. Test the fundraising data query that investors should see
SELECT '=== INVESTOR FUNDRAISING DATA TEST ===' as info;
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
    fd.pitch_video_url,
    fd.created_at
FROM fundraising_details fd
LEFT JOIN startups s ON fd.startup_id = s.id
WHERE fd.active = true
ORDER BY fd.created_at DESC;

-- 2. Test the user profile query that should work for investors
SELECT '=== INVESTOR PROFILE TEST ===' as info;
SELECT 
    u.id,
    u.email,
    u.name,
    u.role,
    u.investor_code
FROM users u
WHERE u.email = 'olympiad_info1@startupnationindia.com';

-- 3. Test the startups query (should return empty for investors)
SELECT '=== INVESTOR STARTUPS TEST ===' as info;
SELECT 
    s.id,
    s.name,
    s.sector,
    s.user_id
FROM startups s
WHERE s.user_id = (
    SELECT id FROM users WHERE email = 'olympiad_info1@startupnationindia.com'
);

-- 4. Test the new investments query
SELECT '=== NEW INVESTMENTS TEST ===' as info;
SELECT 
    ni.id,
    ni.name,
    ni.investment_type,
    ni.investment_value,
    ni.equity_allocation,
    ni.sector
FROM new_investments ni
ORDER BY ni.created_at DESC
LIMIT 5;

-- 5. Test the startup addition requests query
SELECT '=== STARTUP ADDITION REQUESTS TEST ===' as info;
SELECT 
    sar.id,
    sar.name,
    sar.investment_type,
    sar.investment_value,
    sar.equity_allocation,
    sar.sector,
    sar.status,
    sar.created_at
FROM startup_addition_requests sar
ORDER BY sar.created_at DESC
LIMIT 5;

-- 6. Test the investment offers query
SELECT '=== INVESTMENT OFFERS TEST ===' as info;
SELECT 
    io.id,
    io.startup_id,
    io.investor_id,
    io.offer_amount,
    io.equity_percentage,
    io.status
FROM investment_offers io
WHERE io.investor_id = (
    SELECT id FROM users WHERE email = 'olympiad_info1@startupnationindia.com'
)
ORDER BY io.created_at DESC;
