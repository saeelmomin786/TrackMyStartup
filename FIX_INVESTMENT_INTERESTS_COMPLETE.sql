-- Complete fix for Investment Interests issue
-- Uses ONLY user_profiles table (no users table)

-- =====================================================
-- STEP 1: Check current state
-- =====================================================

-- Check if relationship exists
SELECT 
    'Current relationship check' as step,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM investment_advisor_relationships
            WHERE investment_advisor_id = '7322be22-6fbe-41ed-942b-b80c8721cd77'
            AND investor_id = '31f063f4-256a-490a-bb47-338482e3c441'
            AND relationship_type = 'advisor_investor'
        ) THEN 'Relationship EXISTS'
        ELSE 'Relationship MISSING - will create it'
    END as status;

-- =====================================================
-- STEP 2: Create missing relationship
-- =====================================================

-- Create the relationship if it doesn't exist (for this specific advisor-investor pair)
INSERT INTO investment_advisor_relationships (investment_advisor_id, investor_id, relationship_type)
VALUES (
    '7322be22-6fbe-41ed-942b-b80c8721cd77',
    '31f063f4-256a-490a-bb47-338482e3c441',
    'advisor_investor'
)
ON CONFLICT (investment_advisor_id, investor_id, relationship_type) DO NOTHING;

-- Also create relationships for ALL assigned investors (bulk operation)
INSERT INTO investment_advisor_relationships (investment_advisor_id, investor_id, relationship_type)
SELECT 
    advisor.auth_user_id as investment_advisor_id,
    investor.auth_user_id as investor_id,
    'advisor_investor' as relationship_type
FROM public.user_profiles investor
JOIN public.user_profiles advisor ON advisor.investment_advisor_code = investor.investment_advisor_code_entered
WHERE investor.role = 'Investor'
  AND investor.investment_advisor_code_entered IS NOT NULL
  AND investor.advisor_accepted = true
  AND advisor.role = 'Investment Advisor'
  AND advisor.auth_user_id IS NOT NULL
  AND investor.auth_user_id IS NOT NULL
ON CONFLICT (investment_advisor_id, investor_id, relationship_type) DO NOTHING;

-- =====================================================
-- STEP 3: Update RLS Policy (user_profiles only)
-- =====================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Investment Advisors can view assigned investor favorites" ON public.investor_favorites;

-- Create optimized policy that ONLY checks investment_advisor_relationships (fast, indexed)
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
    -- Only check investment_advisor_relationships table (fast, indexed lookup)
    AND EXISTS (
        SELECT 1 FROM investment_advisor_relationships iar
        WHERE iar.investment_advisor_id = auth.uid()
        AND iar.investor_id = investor_favorites.investor_id
        AND iar.relationship_type = 'advisor_investor'
    )
);

-- =====================================================
-- STEP 4: Verify the fix
-- =====================================================

-- Verify relationship was created
SELECT 
    'Relationship verification' as step,
    COUNT(*) as relationship_count
FROM investment_advisor_relationships
WHERE investment_advisor_id = '7322be22-6fbe-41ed-942b-b80c8721cd77'
AND investor_id = '31f063f4-256a-490a-bb47-338482e3c441'
AND relationship_type = 'advisor_investor';

-- Verify policy was created
SELECT 
    'Policy verification' as step,
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'investor_favorites'
AND policyname = 'Investment Advisors can view assigned investor favorites';

-- Show what should be visible (this will be blocked by RLS, but shows the data exists)
SELECT 
    'Favorites that should be visible' as step,
    COUNT(*) as favorite_count
FROM investor_favorites
WHERE investor_id = '31f063f4-256a-490a-bb47-338482e3c441';

