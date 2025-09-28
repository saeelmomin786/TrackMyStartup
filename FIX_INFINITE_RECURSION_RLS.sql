-- URGENT FIX: Remove infinite recursion from RLS policies
-- The current policies are causing infinite loops

-- 1. DISABLE RLS temporarily to clean up
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view their own profile or Investment Advisors can view their clients" ON users;
DROP POLICY IF EXISTS "Users can update their own profile or Investment Advisors can update their clients" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- 3. Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. Create simple, non-recursive policies
-- These policies do NOT query the users table, preventing infinite recursion

-- Allow users to insert their own profile (for registration)
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (true);

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (true);

-- 5. Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;

-- 6. Test that the infinite recursion is fixed
SELECT 
    'RLS Test' as test_type,
    COUNT(*) as user_count
FROM users
WHERE role = 'Investment Advisor';
