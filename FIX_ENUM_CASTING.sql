-- Fix enum casting issue in get_advisor_clients function
-- The user_role column is an enum type, needs to be cast to text

DROP FUNCTION IF EXISTS get_advisor_clients(uuid);

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

-- Test the function
SELECT * FROM get_advisor_clients('094538f8-c615-4379-a81a-846e891010b9'::uuid);
