-- Fix RLS policies to allow Investment Advisors to update users who entered their code
-- This is needed for the advisor acceptance workflow

-- 1. First, check current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;

-- 2. Drop the restrictive update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- 3. Create a new policy that allows Investment Advisors to update users who entered their code
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

-- 4. Also allow Investment Advisors to view users who entered their code
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

-- 5. Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;

-- 6. Test the policy by checking if the current user can see users who entered their code
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
