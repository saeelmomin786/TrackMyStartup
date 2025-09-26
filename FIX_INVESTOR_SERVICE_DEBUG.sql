-- FIX_INVESTOR_SERVICE_DEBUG.sql
-- Fix the investor service data loading issue

-- 1. First, let's see what the investor service query should return
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
    s.created_at as startup_created_at,
    CASE 
        WHEN s.id IS NULL THEN '❌ JOIN FAILED'
        ELSE '✅ JOIN SUCCESS'
    END as join_status
FROM fundraising_details fd
LEFT JOIN startups s ON fd.startup_id = s.id
WHERE fd.active = true
ORDER BY fd.created_at DESC;

-- 2. Check if there are any RLS issues preventing the join
SELECT '=== RLS PERMISSIONS CHECK ===' as info;
SELECT 
    has_table_privilege('authenticated', 'fundraising_details', 'SELECT') as can_read_fundraising,
    has_table_privilege('authenticated', 'startups', 'SELECT') as can_read_startups;

-- 3. Test the exact query structure that the investor service uses
SELECT '=== EXACT INVESTOR SERVICE QUERY ===' as info;
SELECT 
    fd.*,
    json_build_object(
        'id', s.id,
        'name', s.name,
        'sector', s.sector,
        'compliance_status', s.compliance_status,
        'startup_nation_validated', s.startup_nation_validated,
        'validation_date', s.validation_date,
        'created_at', s.created_at
    ) as startups
FROM fundraising_details fd
LEFT JOIN startups s ON fd.startup_id = s.id
WHERE fd.active = true
ORDER BY fd.created_at DESC;

-- 4. Check if the issue is with the specific startup data
SELECT '=== STARTUP DATA INTEGRITY CHECK ===' as info;
SELECT 
    s.id,
    s.name,
    s.sector,
    s.compliance_status,
    s.startup_nation_validated,
    s.validation_date,
    s.created_at,
    CASE 
        WHEN s.id IS NULL THEN '❌ STARTUP NOT FOUND'
        WHEN s.name IS NULL THEN '❌ STARTUP NAME IS NULL'
        WHEN s.sector IS NULL THEN '❌ STARTUP SECTOR IS NULL'
        ELSE '✅ STARTUP DATA OK'
    END as data_status
FROM startups s
WHERE s.id IN (SELECT startup_id FROM fundraising_details WHERE active = true);

-- 5. Check if there are any NULL values that might cause issues
SELECT '=== NULL VALUES CHECK ===' as info;
SELECT 
    'fundraising_details' as table_name,
    COUNT(*) as total_records,
    COUNT(startup_id) as non_null_startup_id,
    COUNT(*) - COUNT(startup_id) as null_startup_id
FROM fundraising_details
WHERE active = true
UNION ALL
SELECT 
    'startups' as table_name,
    COUNT(*) as total_records,
    COUNT(id) as non_null_id,
    COUNT(*) - COUNT(id) as null_id
FROM startups;
<<<<<<< HEAD

=======
>>>>>>> aba79bbb99c116b96581e88ab62621652ed6a6b7
