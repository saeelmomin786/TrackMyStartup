-- Fix RLS Policy for Investment Advisors to View Assigned Investor Favorites
-- This updates the policy to work with the multi-profile system (user_profiles table)

-- Drop the existing policy
DROP POLICY IF EXISTS "Investment Advisors can view assigned investor favorites" ON public.investor_favorites;

-- Create updated policy that checks both users and user_profiles tables
CREATE POLICY "Investment Advisors can view assigned investor favorites" 
ON public.investor_favorites
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        -- Check if current user is an Investment Advisor (check both tables)
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'Investment Advisor'
    )
    AND EXISTS (
        -- Check if the favorite belongs to an investor assigned to this advisor
        -- Check both users table (old system) and user_profiles table (new system)
        SELECT 1 FROM (
            -- Check users table (old system)
            SELECT 
                u.id,
                u.investment_advisor_code_entered,
                u.advisor_accepted,
                u.role
            FROM public.users u
            WHERE u.id = investor_favorites.investor_id
            AND u.role = 'Investor'
            
            UNION ALL
            
            -- Check user_profiles table (new system)
            SELECT 
                up.auth_user_id as id,
                up.investment_advisor_code_entered,
                up.advisor_accepted,
                up.role
            FROM public.user_profiles up
            WHERE up.auth_user_id = investor_favorites.investor_id
            AND up.role = 'Investor'
        ) investor
        WHERE investor.investment_advisor_code_entered = (
            -- Get advisor code from current user (check both tables)
            SELECT COALESCE(
                (SELECT investment_advisor_code FROM public.users WHERE id = auth.uid()),
                (SELECT investment_advisor_code FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1)
            )
        )
        AND investor.advisor_accepted = true
    )
);

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
WHERE tablename = 'investor_favorites'
AND policyname = 'Investment Advisors can view assigned investor favorites';

-- Test query to verify the policy works
-- Replace 'YOUR_ADVISOR_AUTH_UID' with the actual auth.uid() of the Investment Advisor
-- Replace 'YOUR_INVESTOR_AUTH_UID' with the actual auth.uid() of the assigned investor
-- This will help verify if the policy is working correctly
SELECT 
    'Testing RLS policy - Run this as the Investment Advisor user' as test_info,
    COUNT(*) as total_favorites_visible
FROM public.investor_favorites;

