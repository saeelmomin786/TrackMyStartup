-- FINAL_FUNDRAISING_FIX.sql
-- Remove the conflicting SELECT policy that's preventing investors from seeing fundraising data

-- 1. Drop the conflicting restrictive policy
DROP POLICY IF EXISTS "Users can view their own fundraising details" ON fundraising_details;

-- 2. Verify only the correct policies remain
SELECT '=== REMAINING POLICIES ===' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'fundraising_details'
ORDER BY policyname;

-- 3. Test the investor query again
SELECT '=== INVESTOR QUERY TEST ===' as info;
SELECT 
    fd.id,
    fd.startup_id,
    fd.active,
    fd.type,
    fd.value,
    fd.equity,
    s.name as startup_name,
    s.sector
FROM fundraising_details fd
LEFT JOIN startups s ON fd.startup_id = s.id
WHERE fd.active = true
ORDER BY fd.created_at DESC;

-- 4. Test with a specific startup (your "Sid" startup with ₹50,00,000 Pre-Seed)
SELECT '=== YOUR FUNDRAISING RECORD ===' as info;
SELECT 
    fd.id,
    fd.startup_id,
    fd.active,
    fd.type,
    fd.value,
    fd.equity,
    s.name as startup_name,
    s.sector,
    fd.pitch_deck_url,
    fd.pitch_video_url
FROM fundraising_details fd
LEFT JOIN startups s ON fd.startup_id = s.id
WHERE s.name = 'Sid' AND fd.active = true;
<<<<<<< HEAD

=======
>>>>>>> aba79bbb99c116b96581e88ab62621652ed6a6b7
