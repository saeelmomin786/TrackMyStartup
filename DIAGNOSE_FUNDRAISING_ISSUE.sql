-- DIAGNOSE_FUNDRAISING_ISSUE.sql
-- This script diagnoses why fundraising requests are not visible to investors

-- 1. Check if fundraising_details table exists and has data
SELECT '=== FUNDRAISING_DETAILS TABLE STATUS ===' as info;
SELECT 
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'fundraising_details'
    ) as table_exists;

-- 2. Check total records in fundraising_details
SELECT '=== TOTAL RECORDS ===' as info;
SELECT COUNT(*) as total_records FROM fundraising_details;

-- 3. Check active fundraising records
SELECT '=== ACTIVE FUNDRAISING RECORDS ===' as info;
SELECT 
    id,
    startup_id,
    active,
    type,
    value,
    equity,
    validation_requested,
    created_at
FROM fundraising_details 
WHERE active = true
ORDER BY created_at DESC;

-- 4. Check all fundraising records (active and inactive)
SELECT '=== ALL FUNDRAISING RECORDS ===' as info;
SELECT 
    id,
    startup_id,
    active,
    type,
    value,
    equity,
    validation_requested,
    created_at
FROM fundraising_details 
ORDER BY created_at DESC;

-- 5. Check RLS status on fundraising_details table
SELECT '=== RLS STATUS ===' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'fundraising_details' 
    AND schemaname = 'public';

-- 6. Check RLS policies on fundraising_details table
SELECT '=== RLS POLICIES ===' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'fundraising_details'
ORDER BY policyname;

-- 7. Check if we can read from fundraising_details as current user
SELECT '=== PERMISSIONS TEST ===' as info;
SELECT 
    has_table_privilege(current_user, 'fundraising_details', 'SELECT') as can_select,
    has_table_privilege('authenticated', 'fundraising_details', 'SELECT') as auth_can_select;

-- 8. Test the exact query that investors use
SELECT '=== INVESTOR QUERY TEST ===' as info;
SELECT 
    fd.id,
    fd.startup_id,
    fd.active,
    fd.type,
    fd.value,
    fd.equity,
    s.id as startup_id_from_join,
    s.name as startup_name,
    s.sector
FROM fundraising_details fd
LEFT JOIN startups s ON fd.startup_id = s.id
WHERE fd.active = true
ORDER BY fd.created_at DESC;

-- 9. Check if there are any startups without fundraising details
SELECT '=== STARTUPS WITHOUT FUNDRAISING ===' as info;
SELECT 
    s.id,
    s.name,
    s.sector,
    s.user_id
FROM startups s
LEFT JOIN fundraising_details fd ON s.id = fd.startup_id
WHERE fd.startup_id IS NULL
ORDER BY s.created_at DESC;

-- 10. Check recent startups that might have fundraising
SELECT '=== RECENT STARTUPS ===' as info;
SELECT 
    id,
    name,
    sector,
    user_id,
    created_at
FROM startups 
ORDER BY created_at DESC
LIMIT 10;
<<<<<<< HEAD

=======
>>>>>>> aba79bbb99c116b96581e88ab62621652ed6a6b7
