-- TEST_FUNDRAISING_FLOW.sql
-- This script tests the complete fundraising flow to identify the issue

-- 1. First, let's see what startups exist
SELECT '=== AVAILABLE STARTUPS ===' as info;
SELECT 
    id,
    name,
    sector,
    user_id,
    created_at
FROM startups 
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check if any of these startups have fundraising details
SELECT '=== STARTUPS WITH FUNDRAISING ===' as info;
SELECT 
    s.id as startup_id,
    s.name as startup_name,
    s.sector,
    fd.id as fundraising_id,
    fd.active,
    fd.type,
    fd.value,
    fd.equity,
    fd.created_at as fundraising_created
FROM startups s
LEFT JOIN fundraising_details fd ON s.id = fd.startup_id
ORDER BY s.created_at DESC
LIMIT 10;

-- 3. Let's manually insert a test fundraising record to see if the issue is with data insertion
-- First, get the most recent startup
SELECT '=== INSERTING TEST FUNDRAISING ===' as info;

-- Insert a test fundraising record for the most recent startup
INSERT INTO fundraising_details (
    startup_id,
    active,
    type,
    value,
    equity,
    validation_requested,
    pitch_deck_url,
    pitch_video_url
) 
SELECT 
    s.id,
    true,
    'Pre-Seed',
    5000000,  -- ₹50,00,000
    10,       -- 10%
    false,
    'https://example.com/pitch-deck.pdf',
    'https://example.com/pitch-video.mp4'
FROM startups s
WHERE s.id = (SELECT MAX(id) FROM startups)
ON CONFLICT DO NOTHING;

-- 4. Verify the test record was inserted
SELECT '=== VERIFYING TEST INSERT ===' as info;
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
WHERE startup_id = (SELECT MAX(id) FROM startups);

-- 5. Test the investor query with the new data
SELECT '=== TESTING INVESTOR QUERY ===' as info;
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

-- 6. Check RLS policies one more time
SELECT '=== FINAL RLS CHECK ===' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'fundraising_details'
ORDER BY policyname;
<<<<<<< HEAD

=======
>>>>>>> aba79bbb99c116b96581e88ab62621652ed6a6b7
