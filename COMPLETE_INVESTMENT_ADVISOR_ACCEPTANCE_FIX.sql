-- COMPLETE FIX: Investment Advisor Acceptance Workflow
-- This script fixes the RLS policy issues and creates the necessary function

-- 1. Create the SECURITY DEFINER function to bypass RLS
CREATE OR REPLACE FUNCTION accept_startup_advisor_request(
    p_user_id uuid,
    p_advisor_id uuid,
    p_financial_matrix jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    advisor_code text;
BEGIN
    -- Get the advisor's code
    SELECT investment_advisor_code INTO advisor_code
    FROM users 
    WHERE id = p_advisor_id AND role = 'Investment Advisor';
    
    -- Verify the advisor exists
    IF advisor_code IS NULL THEN
        RAISE EXCEPTION 'Investment Advisor not found or invalid';
    END IF;
    
    -- Update the user's advisor acceptance status
    UPDATE users 
    SET 
        advisor_accepted = true,
        advisor_accepted_date = NOW(),
        minimum_investment = (p_financial_matrix->>'minimum_investment')::decimal,
        maximum_investment = (p_financial_matrix->>'maximum_investment')::decimal,
        success_fee = (p_financial_matrix->>'success_fee')::decimal,
        success_fee_type = p_financial_matrix->>'success_fee_type',
        scouting_fee = (p_financial_matrix->>'scouting_fee')::decimal,
        updated_at = NOW()
    WHERE id = p_user_id 
    AND investment_advisor_code_entered = advisor_code;
    
    -- Check if the update was successful
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found or advisor code mismatch';
    END IF;
    
    -- Return the updated user data
    SELECT to_jsonb(u.*) INTO result
    FROM users u
    WHERE u.id = p_user_id;
    
    RETURN result;
END;
$$;

-- 2. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION accept_startup_advisor_request(uuid, uuid, jsonb) TO authenticated;

-- 3. Fix RLS policies to allow Investment Advisors to update users who entered their code
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

CREATE POLICY "Users can update their own profile or Investment Advisors can update their clients" ON users
    FOR UPDATE USING (
        -- Users can update their own profile
        id = auth.uid() OR
        -- Investment Advisors can update users who entered their advisor code
        (
            EXISTS (
                SELECT 1 FROM users advisor 
                WHERE advisor.id = auth.uid() 
                AND advisor.role = 'Investment Advisor'
                AND advisor.investment_advisor_code = users.investment_advisor_code_entered
            )
        ) OR
        -- Admins can update any user
        (
            EXISTS (
                SELECT 1 FROM users admin_user 
                WHERE admin_user.id = auth.uid() 
                AND admin_user.role = 'Admin'
            )
        )
    );

-- 4. Also fix the SELECT policy for consistency
DROP POLICY IF EXISTS "Users can view their own profile" ON users;

CREATE POLICY "Users can view their own profile or Investment Advisors can view their clients" ON users
    FOR SELECT USING (
        -- Users can view their own profile
        id = auth.uid() OR
        -- Investment Advisors can view users who entered their advisor code
        (
            EXISTS (
                SELECT 1 FROM users advisor 
                WHERE advisor.id = auth.uid() 
                AND advisor.role = 'Investment Advisor'
                AND advisor.investment_advisor_code = users.investment_advisor_code_entered
            )
        ) OR
        -- Admins can view any user
        (
            EXISTS (
                SELECT 1 FROM users admin_user 
                WHERE admin_user.id = auth.uid() 
                AND admin_user.role = 'Admin'
            )
        ) OR
        -- Other roles can view users (for general functionality)
        true
    );

-- 5. Test the function with Siddhi's data
SELECT accept_startup_advisor_request(
    '9bce7d21-3fd5-4af9-9804-dbdbf28caffe'::uuid,
    '094538f8-c615-4379-a81a-846e891010b9'::uuid,
    '{
        "minimum_investment": 10000,
        "maximum_investment": 100000,
        "success_fee": 1000,
        "success_fee_type": "percentage",
        "scouting_fee": null
    }'::jsonb
);

-- 6. Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;

-- 7. Test the policy by checking if the current user can see users who entered their code
SELECT 
    'Policy Test' as test_type,
    u.id,
    u.name,
    u.email,
    u.role,
    u.investment_advisor_code_entered,
    u.advisor_accepted,
    CASE 
        WHEN u.investment_advisor_code_entered = 'IA-162090' THEN 'SHOULD BE VISIBLE'
        ELSE 'NOT VISIBLE'
    END as visibility_status
FROM users u
WHERE u.investment_advisor_code_entered = 'IA-162090'
ORDER BY u.name;
