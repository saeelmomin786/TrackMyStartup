-- Fix RLS Policy for Investment Advisors to View Assigned Investor Favorites
-- This version checks BOTH investment_advisor_relationships table AND users/user_profiles tables
-- This ensures it works even if relationships aren't created in the relationships table

-- Drop the existing policy
DROP POLICY IF EXISTS "Investment Advisors can view assigned investor favorites" ON public.investor_favorites;

-- Create updated policy that checks multiple sources
CREATE POLICY "Investment Advisors can view assigned investor favorites" 
ON public.investor_favorites
FOR SELECT 
TO authenticated
USING (
    -- Check if current user is an Investment Advisor
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'Investment Advisor'
    )
    AND (
        -- Option 1: Check investment_advisor_relationships table
        EXISTS (
            SELECT 1 FROM investment_advisor_relationships iar
            WHERE iar.investment_advisor_id = auth.uid()
            AND iar.investor_id = investor_favorites.investor_id
            AND iar.relationship_type = 'advisor_investor'
        )
        OR
        -- Option 2: Check users table (old system)
        EXISTS (
            SELECT 1 FROM public.users investor
            WHERE investor.id = investor_favorites.investor_id
            AND investor.role = 'Investor'
            AND investor.investment_advisor_code_entered = (
                SELECT investment_advisor_code FROM public.users WHERE id = auth.uid()
            )
            AND investor.advisor_accepted = true
        )
        OR
        -- Option 3: Check user_profiles table (new system)
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.auth_user_id = investor_favorites.investor_id
            AND up.role = 'Investor'
            AND up.investment_advisor_code_entered = (
                SELECT COALESCE(
                    (SELECT investment_advisor_code FROM public.users WHERE id = auth.uid()),
                    (SELECT investment_advisor_code FROM public.user_profiles WHERE auth_user_id = auth.uid() LIMIT 1)
                )
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

