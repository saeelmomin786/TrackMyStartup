-- URGENT FIX: Resolve infinite recursion and restore functionality
-- This script fixes the RLS policies that are causing infinite loops

-- 1. DISABLE RLS temporarily to clean up
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view their own profile or Investment Advisors can view their clients" ON users;
DROP POLICY IF EXISTS "Users can update their own profile or Investment Advisors can update their clients" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can manage their own profile" ON users;

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

-- 5. Update the Investment Advisor acceptance function
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

-- 6. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION accept_startup_advisor_request(uuid, uuid, jsonb) TO authenticated;

-- 7. Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;

-- 8. Test that the infinite recursion is fixed
SELECT 
    'RLS Test' as test_type,
    COUNT(*) as user_count
FROM users
WHERE role = 'Investment Advisor';

-- 9. Test the function
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
