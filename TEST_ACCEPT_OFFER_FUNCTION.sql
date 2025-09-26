-- TEST_ACCEPT_OFFER_FUNCTION.sql
-- This script tests the accept_investment_offer_with_fee function to identify the 400 error

-- 1. Check if the calculate_scouting_fee function exists
SELECT '=== CHECKING CALCULATE_SCOUTING_FEE FUNCTION ===' as info;
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name = 'calculate_scouting_fee';

-- 2. Test the calculate_scouting_fee function directly
SELECT '=== TESTING CALCULATE_SCOUTING_FEE FUNCTION ===' as info;
SELECT calculate_scouting_fee('United States', 'Startup', 1000000.00) as test_fee;

-- 3. Check the investment_offers table structure
SELECT '=== CHECKING INVESTMENT_OFFERS TABLE ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'investment_offers'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check if there are any investment offers
SELECT '=== CHECKING EXISTING INVESTMENT OFFERS ===' as info;
SELECT 
    id,
    investor_email,
    startup_name,
    offer_amount,
    equity_percentage,
    status,
    startup_id
FROM investment_offers
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check the specific offer that's failing (ID 37)
SELECT '=== CHECKING OFFER ID 37 ===' as info;
SELECT 
    id,
    investor_email,
    startup_name,
    offer_amount,
    equity_percentage,
    status,
    startup_id,
    startup_scouting_fee_paid,
    investor_scouting_fee_paid
FROM investment_offers
WHERE id = 37;

-- 6. Test the accept function with a simple call (this will show the exact error)
SELECT '=== TESTING ACCEPT FUNCTION (THIS WILL SHOW THE ERROR) ===' as info;
-- Note: This might fail, but it will show us the exact error message
SELECT accept_investment_offer_with_fee(37, 'United States', 255000.00) as test_result;
<<<<<<< HEAD

=======
>>>>>>> aba79bbb99c116b96581e88ab62621652ed6a6b7
