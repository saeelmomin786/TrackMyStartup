-- DEBUG_INVESTOR_SERVICE.sql
-- Debug what the investor service should be returning

-- 1. Test the exact query that investorService.getActiveFundraisingStartups() uses
SELECT '=== INVESTOR SERVICE QUERY DEBUG ===' as info;
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

-- 2. Check if there are any RLS issues by testing as different user contexts
SELECT '=== RLS TEST - COUNT OF ACTIVE FUNDRAISING ===' as info;
SELECT COUNT(*) as total_active_fundraising FROM fundraising_details WHERE active = true;

-- 3. Check the specific fundraising record for "Sid" startup
SELECT '=== SID STARTUP FUNDRAISING DEBUG ===' as info;
SELECT 
    fd.id,
    fd.startup_id,
    fd.active,
    fd.type,
    fd.value,
    fd.equity,
    s.name as startup_name,
    s.sector,
    s.user_id,
    s.compliance_status
FROM fundraising_details fd
LEFT JOIN startups s ON fd.startup_id = s.id
WHERE s.name = 'Sid' AND fd.active = true;

-- 4. Check if the startup exists and has the right data
SELECT '=== SID STARTUP DATA CHECK ===' as info;
SELECT 
    id,
    name,
    sector,
    user_id,
    compliance_status,
    startup_nation_validated,
    validation_date
FROM startups 
WHERE name = 'Sid';

-- 5. Test the join that might be failing
SELECT '=== JOIN TEST ===' as info;
SELECT 
    fd.id as fundraising_id,
    fd.startup_id,
    fd.active,
    s.id as startup_id,
    s.name as startup_name,
    CASE 
        WHEN s.id IS NULL THEN '❌ JOIN FAILED - No startup found'
        WHEN fd.active = false THEN '❌ FUNDRAISING INACTIVE'
        ELSE '✅ JOIN SUCCESS'
    END as status
FROM fundraising_details fd
LEFT JOIN startups s ON fd.startup_id = s.id
WHERE fd.id = 'e8fb5e5a-4e9c-4cf6-a85b-5b8cbe4ba6b0'; -- Your Sid startup's fundraising ID
<<<<<<< HEAD

=======
>>>>>>> aba79bbb99c116b96581e88ab62621652ed6a6b7
