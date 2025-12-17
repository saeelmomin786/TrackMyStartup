-- =====================================================
-- FIX INVESTOR_FAVORITES FOREIGN KEY CONSTRAINT
-- =====================================================
-- Problem: investor_favorites.investor_id has a foreign key to users(id)
--          but the frontend might be inserting profile IDs instead of auth user IDs
-- Solution: Update RLS policy to ONLY allow auth.uid() to be inserted
--           This ensures the foreign key constraint is satisfied
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.investor_favorites;
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.investor_favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.investor_favorites;
DROP POLICY IF EXISTS "Investors can insert their own favorites" ON public.investor_favorites;
DROP POLICY IF EXISTS "Investors can view their own favorites" ON public.investor_favorites;
DROP POLICY IF EXISTS "Investors can delete their own favorites" ON public.investor_favorites;
DROP POLICY IF EXISTS "Investment Advisors can insert their own favorites" ON public.investor_favorites;
DROP POLICY IF EXISTS "Investment Advisors can view their own favorites" ON public.investor_favorites;
DROP POLICY IF EXISTS "Investment Advisors can delete their own favorites" ON public.investor_favorites;
DROP POLICY IF EXISTS "Investment Advisors can view assigned investor favorites" ON public.investor_favorites;

-- =====================================================
-- INSERT POLICY: Only allow auth.uid() to be inserted
-- =====================================================
-- This ensures investor_id always matches users.id (satisfies foreign key)
CREATE POLICY "Users can insert their own favorites" 
ON public.investor_favorites
FOR INSERT 
TO authenticated
WITH CHECK (
    -- CRITICAL: Only allow auth.uid() to be inserted (not profile IDs)
    -- This satisfies the foreign key constraint: investor_id REFERENCES users(id)
    investor_id = auth.uid()
    AND
    -- Ensure user is Investor or Investment Advisor
    (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.auth_user_id = auth.uid()
            AND (up.role = 'Investor' OR up.role = 'Investment Advisor')
        )
        OR
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND (u.role = 'Investor' OR u.role = 'Investment Advisor')
        )
    )
);

-- =====================================================
-- SELECT POLICY: Users can view their own favorites
-- =====================================================
CREATE POLICY "Users can view their own favorites" 
ON public.investor_favorites
FOR SELECT 
TO authenticated
USING (
    -- Direct match with auth.uid()
    investor_id = auth.uid()
    OR
    -- Investment Advisors can view favorites of their assigned investors
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.auth_user_id = auth.uid()
        AND up.role = 'Investment Advisor'
        AND EXISTS (
            SELECT 1 FROM public.user_profiles investor_profile
            WHERE investor_profile.id::text = investor_favorites.investor_id::text
            AND investor_profile.investment_advisor_code_entered = (
                SELECT investment_advisor_code FROM public.user_profiles
                WHERE auth_user_id = auth.uid()
                AND role = 'Investment Advisor'
            )
            AND investor_profile.advisor_accepted = true
        )
    )
    OR
    -- Legacy: Check users table
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.role = 'Investment Advisor'
        AND EXISTS (
            SELECT 1 FROM public.users investor
            WHERE investor.id = investor_favorites.investor_id
            AND investor.investment_advisor_code_entered = (
                SELECT investment_advisor_code FROM public.users WHERE id = auth.uid()
            )
            AND investor.advisor_accepted = true
        )
    )
);

-- =====================================================
-- DELETE POLICY: Users can delete their own favorites
-- =====================================================
CREATE POLICY "Users can delete their own favorites" 
ON public.investor_favorites
FOR DELETE 
TO authenticated
USING (
    -- Only allow deleting own favorites (auth.uid() = investor_id)
    investor_id = auth.uid()
);

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT 
    '✅ INVESTOR_FAVORITES FOREIGN KEY FIX COMPLETE' as status,
    'RLS policies now enforce that investor_id = auth.uid()' as note,
    'Frontend must use auth.uid() (not profile ID) when inserting favorites' as result;




