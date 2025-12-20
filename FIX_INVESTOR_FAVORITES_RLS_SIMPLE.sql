-- Fix RLS Policy for Investment Advisors to View Assigned Investor Favorites
-- Simplified version that should work better

-- Drop the existing policy
DROP POLICY IF EXISTS "Investment Advisors can view assigned investor favorites" ON public.investor_favorites;

-- Create a simpler policy that uses a function to check both tables
CREATE OR REPLACE FUNCTION check_investor_assigned_to_advisor(
    p_investor_id UUID,
    p_advisor_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_advisor_code TEXT;
BEGIN
    -- Get advisor code from users table first, then user_profiles
    SELECT COALESCE(
        (SELECT investment_advisor_code FROM public.users WHERE id = p_advisor_id),
        (SELECT investment_advisor_code FROM public.user_profiles WHERE auth_user_id = p_advisor_id LIMIT 1)
    ) INTO v_advisor_code;
    
    -- If no advisor code found, return false
    IF v_advisor_code IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if investor is assigned to advisor in users table
    IF EXISTS (
        SELECT 1 FROM public.users
        WHERE id = p_investor_id
        AND role = 'Investor'
        AND investment_advisor_code_entered = v_advisor_code
        AND advisor_accepted = true
    ) THEN
        RETURN true;
    END IF;
    
    -- Check if investor is assigned to advisor in user_profiles table
    IF EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE auth_user_id = p_investor_id
        AND role = 'Investor'
        AND investment_advisor_code_entered = v_advisor_code
        AND advisor_accepted = true
    ) THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the RLS policy using the function
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
    AND check_investor_assigned_to_advisor(
        investor_favorites.investor_id,
        auth.uid()
    )
);

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_investor_assigned_to_advisor(UUID, UUID) TO authenticated;

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

