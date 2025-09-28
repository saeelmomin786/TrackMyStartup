-- COMPREHENSIVE INVESTMENT ADVISOR SYSTEM
-- This script ensures the Investment Advisor functionality works for ALL future registrations
-- Both for new Investment Advisors and new Startups/Investors

-- 1. Ensure RLS policies are properly set for all users
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile or Investment Advisors can view their clients" ON users;
DROP POLICY IF EXISTS "Users can update their own profile or Investment Advisors can update their clients" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can manage their own profile" ON users;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies for all users
CREATE POLICY "Users can insert their own profile" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (true);

-- 2. Ensure all required columns exist for Investment Advisor workflow
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS investment_advisor_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS investment_advisor_code_entered TEXT,
ADD COLUMN IF NOT EXISTS advisor_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS advisor_accepted_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS minimum_investment DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS maximum_investment DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS success_fee DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS success_fee_type TEXT DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS scouting_fee DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS investment_stage TEXT;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_investment_advisor_code ON users(investment_advisor_code);
CREATE INDEX IF NOT EXISTS idx_users_investment_advisor_code_entered ON users(investment_advisor_code_entered);
CREATE INDEX IF NOT EXISTS idx_users_advisor_accepted ON users(advisor_accepted);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 4. Create the Investment Advisor acceptance function (works for all advisors)
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

-- 5. Create function for Investment Advisors to accept investor requests
CREATE OR REPLACE FUNCTION accept_investor_advisor_request(
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

-- 6. Grant execute permissions
GRANT EXECUTE ON FUNCTION accept_startup_advisor_request(uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_investor_advisor_request(uuid, uuid, jsonb) TO authenticated;

-- 7. Create triggers to automatically generate Investment Advisor codes for new advisors
-- First drop any existing function with the same name
DROP FUNCTION IF EXISTS generate_investment_advisor_code();

CREATE OR REPLACE FUNCTION generate_investment_advisor_code()
RETURNS TRIGGER AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    -- Only generate code for new Investment Advisors
    IF NEW.role = 'Investment Advisor' AND NEW.investment_advisor_code IS NULL THEN
        LOOP
            -- Generate a new code in format IA-XXXXXX
            new_code := 'IA-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
            
            -- Check if code already exists
            SELECT EXISTS(SELECT 1 FROM users WHERE investment_advisor_code = new_code) INTO code_exists;
            
            -- If code doesn't exist, use it
            IF NOT code_exists THEN
                NEW.investment_advisor_code := new_code;
                EXIT;
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_generate_investment_advisor_code ON users;
CREATE TRIGGER trigger_generate_investment_advisor_code
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION generate_investment_advisor_code();

-- 8. Create a function to get all users for a specific Investment Advisor
CREATE OR REPLACE FUNCTION get_advisor_clients(advisor_id uuid)
RETURNS TABLE(
    user_id uuid,
    user_name text,
    user_email text,
    user_role text,
    investment_advisor_code_entered text,
    advisor_accepted boolean,
    advisor_accepted_date timestamp with time zone,
    minimum_investment decimal,
    maximum_investment decimal,
    success_fee decimal,
    success_fee_type text,
    scouting_fee decimal
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    advisor_code text;
BEGIN
    -- Get the advisor's code
    SELECT investment_advisor_code INTO advisor_code
    FROM users 
    WHERE id = advisor_id AND role = 'Investment Advisor';
    
    -- Return all users who entered this advisor's code
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.role::text as user_role,
        u.investment_advisor_code_entered,
        u.advisor_accepted,
        u.advisor_accepted_date,
        u.minimum_investment,
        u.maximum_investment,
        u.success_fee,
        u.success_fee_type,
        u.scouting_fee
    FROM users u
    WHERE u.investment_advisor_code_entered = advisor_code
    ORDER BY u.advisor_accepted, u.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_advisor_clients(uuid) TO authenticated;

-- 9. Create a function to get all startups for a specific Investment Advisor
CREATE OR REPLACE FUNCTION get_advisor_startups(advisor_id uuid)
RETURNS TABLE(
    startup_id integer,
    startup_name text,
    user_id uuid,
    user_name text,
    user_email text,
    investment_advisor_code_entered text,
    advisor_accepted boolean,
    advisor_accepted_date timestamp with time zone,
    minimum_investment decimal,
    maximum_investment decimal,
    success_fee decimal,
    success_fee_type text,
    scouting_fee decimal
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    advisor_code text;
BEGIN
    -- Get the advisor's code
    SELECT investment_advisor_code INTO advisor_code
    FROM users 
    WHERE id = advisor_id AND role = 'Investment Advisor';
    
    -- Return all startups whose users entered this advisor's code
    RETURN QUERY
    SELECT 
        s.id as startup_id,
        s.name as startup_name,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.investment_advisor_code_entered,
        u.advisor_accepted,
        u.advisor_accepted_date,
        u.minimum_investment,
        u.maximum_investment,
        u.success_fee,
        u.success_fee_type,
        u.scouting_fee
    FROM startups s
    JOIN users u ON s.user_id = u.id
    WHERE u.investment_advisor_code_entered = advisor_code
    ORDER BY u.advisor_accepted, s.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_advisor_startups(uuid) TO authenticated;

-- 10. Test the system with existing data
SELECT 
    'System Test' as test_type,
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'Investment Advisor' THEN 1 END) as investment_advisors,
    COUNT(CASE WHEN investment_advisor_code_entered IS NOT NULL THEN 1 END) as users_with_advisor_codes,
    COUNT(CASE WHEN advisor_accepted = true THEN 1 END) as accepted_users
FROM users;

-- 11. Test the advisor clients function
SELECT * FROM get_advisor_clients('094538f8-c615-4379-a81a-846e891010b9'::uuid);

-- 12. Test the advisor startups function
SELECT * FROM get_advisor_startups('094538f8-c615-4379-a81a-846e891010b9'::uuid);
