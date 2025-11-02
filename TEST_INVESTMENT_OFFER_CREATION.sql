-- Test the create_investment_offer_with_fee function
-- This helps verify the function is working correctly

-- 1. Check function signature
SELECT 
    routine_name,
    routine_definition,
    data_type,
    routine_type
FROM information_schema.routines
WHERE routine_name = 'create_investment_offer_with_fee'
ORDER BY routine_name;

-- 2. Verify function parameters
SELECT 
    parameter_name,
    parameter_mode,
    data_type,
    parameter_default
FROM information_schema.parameters
WHERE specific_name IN (
    SELECT specific_name 
    FROM information_schema.routines 
    WHERE routine_name = 'create_investment_offer_with_fee'
)
ORDER BY ordinal_position;

-- 3. Check recent offers to see their stage and advisor statuses
SELECT 
    id,
    investor_email,
    startup_name,
    startup_id,
    investment_id,
    stage,
    status,
    investor_advisor_approval_status,
    startup_advisor_approval_status,
    created_at
FROM investment_offers
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check if investors have advisor codes
SELECT 
    email,
    investment_advisor_code,
    investment_advisor_code_entered,
    COALESCE(investment_advisor_code, investment_advisor_code_entered) as has_advisor_code
FROM users
WHERE role = 'Investor'
ORDER BY email
LIMIT 10;


