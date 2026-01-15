-- =====================================================
-- ADD UPDATE POLICY FOR country_plan_prices
-- =====================================================
-- This allows admins to update India prices
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop existing UPDATE policy if it exists
DROP POLICY IF EXISTS "Admins can update country plan prices" ON country_plan_prices;

-- Create UPDATE policy for admins
-- Note: Adjust the condition based on your admin role check
-- This example allows authenticated users to update (you may want to add role check)
CREATE POLICY "Admins can update country plan prices"
    ON country_plan_prices
    FOR UPDATE
    USING (true)  -- Allow all authenticated users for now
    WITH CHECK (true);

-- Alternative: If you have a user_roles table or admin check
-- CREATE POLICY "Admins can update country plan prices"
--     ON country_plan_prices
--     FOR UPDATE
--     USING (
--         EXISTS (
--             SELECT 1 FROM user_profiles
--             WHERE user_profiles.user_id = auth.uid()
--             AND user_profiles.role = 'admin'
--         )
--     )
--     WITH CHECK (
--         EXISTS (
--             SELECT 1 FROM user_profiles
--             WHERE user_profiles.user_id = auth.uid()
--             AND user_profiles.role = 'admin'
--         )
--     );

-- Grant UPDATE permission
GRANT UPDATE ON country_plan_prices TO authenticated;

-- Verify the policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'country_plan_prices'
AND cmd = 'UPDATE';
