-- Fix RLS Policy for Investment Advisors to View Assigned Investor Favorites
-- UPDATED: Only uses user_profiles table (new system), no users table

-- Drop the existing policy
DROP POLICY IF EXISTS "Investment Advisors can view assigned investor favorites" ON public.investor_favorites;

-- Create updated policy that ONLY checks user_profiles table
CREATE POLICY "Investment Advisors can view assigned investor favorites" 
ON public.investor_favorites
FOR SELECT 
TO authenticated
USING (
    -- Check if current user is an Investment Advisor (in user_profiles)
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE auth_user_id = auth.uid()
        AND role = 'Investment Advisor'
    )
    AND (
        -- Option 1: Check investment_advisor_relationships table (if it exists and has the relationship)
        EXISTS (
            SELECT 1 FROM investment_advisor_relationships iar
            WHERE iar.investment_advisor_id = auth.uid()
            AND iar.investor_id = investor_favorites.investor_id
            AND iar.relationship_type = 'advisor_investor'
        )
        OR
        -- Option 2: Check user_profiles table directly (primary method)
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.auth_user_id = investor_favorites.investor_id
            AND up.role = 'Investor'
            AND up.investment_advisor_code_entered = (
                SELECT investment_advisor_code 
                FROM public.user_profiles 
                WHERE auth_user_id = auth.uid() 
                AND role = 'Investment Advisor'
                LIMIT 1
            )
            AND up.advisor_accepted = true
        )
    )
);

-- Verify the policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'investor_favorites'
AND policyname = 'Investment Advisors can view assigned investor favorites';

