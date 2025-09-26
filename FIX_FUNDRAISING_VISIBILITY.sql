-- FIX_FUNDRAISING_VISIBILITY.sql
-- This script fixes the fundraising visibility issue for investors

-- 1. Check current RLS status and policies
SELECT '=== CURRENT RLS STATUS ===' as info;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'fundraising_details' 
    AND schemaname = 'public';

SELECT '=== CURRENT POLICIES ===' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'fundraising_details'
ORDER BY policyname;

-- 2. Drop ALL existing conflicting policies
SELECT '=== DROPPING CONFLICTING POLICIES ===' as info;

DROP POLICY IF EXISTS "Users can view their own startup's fundraising details" ON fundraising_details;
DROP POLICY IF EXISTS "Startup users can manage their own fundraising details" ON fundraising_details;
DROP POLICY IF EXISTS "Users can delete their own fundraising details" ON fundraising_details;
DROP POLICY IF EXISTS "Users can insert their own fundraising details" ON fundraising_details;
DROP POLICY IF EXISTS "Users can update their own fundraising details" ON fundraising_details;
DROP POLICY IF EXISTS "fundraising_details_read_all" ON fundraising_details;
DROP POLICY IF EXISTS "fundraising_details_owner_manage" ON fundraising_details;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON fundraising_details;

-- 3. Create new, correct policies
SELECT '=== CREATING NEW POLICIES ===' as info;

-- Policy 1: Allow ALL authenticated users to READ fundraising details (for investors to see opportunities)
CREATE POLICY "fundraising_details_read_all" ON fundraising_details
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 2: Allow startup owners to manage their own fundraising details
CREATE POLICY "fundraising_details_owner_manage" ON fundraising_details
    FOR ALL
    TO authenticated
    USING (
        startup_id IN (
            SELECT id FROM startups 
            WHERE user_id = auth.uid()
        )
    );

-- 4. Grant necessary permissions
GRANT SELECT ON fundraising_details TO authenticated;
GRANT SELECT ON startups TO authenticated;

-- 5. Verify the new policies
SELECT '=== NEW POLICIES CREATED ===' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'fundraising_details'
ORDER BY policyname;

-- 6. Test the fix by checking if we can see active fundraising
SELECT '=== TESTING FIX ===' as info;
SELECT 
    COUNT(*) as total_active_fundraising,
    COUNT(CASE WHEN active = true THEN 1 END) as active_count
FROM fundraising_details;

-- 7. Show sample active fundraising data
SELECT '=== SAMPLE ACTIVE FUNDRAISING DATA ===' as info;
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
LIMIT 5;
<<<<<<< HEAD

=======
>>>>>>> aba79bbb99c116b96581e88ab62621652ed6a6b7
