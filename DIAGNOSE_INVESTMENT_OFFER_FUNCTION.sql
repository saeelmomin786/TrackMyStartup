-- Diagnose create_investment_offer_with_fee function
-- This helps identify parameter or permission issues

-- 1. Check function existence and signature
SELECT 
    routine_name,
    routine_definition,
    data_type,
    routine_type,
    external_language
FROM information_schema.routines
WHERE routine_name = 'create_investment_offer_with_fee';

-- 2. Check function parameters in order
SELECT 
    parameter_name,
    parameter_mode,
    data_type,
    parameter_default,
    ordinal_position
FROM information_schema.parameters
WHERE specific_name IN (
    SELECT specific_name 
    FROM information_schema.routines 
    WHERE routine_name = 'create_investment_offer_with_fee'
)
ORDER BY ordinal_position;

-- 3. Check permissions
SELECT 
    routine_schema,
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'create_investment_offer_with_fee';

-- 4. Test function with sample data (replace with actual test data)
-- This will help identify if the function itself works
-- DO $$
-- DECLARE
--     test_offer_id INTEGER;
-- BEGIN
--     -- Replace with actual test data
--     test_offer_id := public.create_investment_offer_with_fee(
--         'test@example.com'::TEXT,
--         'Test Startup'::TEXT,
--         100000::DECIMAL,
--         10::DECIMAL,
--         'USD'::TEXT,
--         NULL::INTEGER,
--         1::INTEGER
--     );
--     RAISE NOTICE 'Test offer created with ID: %', test_offer_id;
-- END $$;

-- 5. Check if there are any conflicting function signatures
SELECT 
    r.routine_name,
    p.parameter_name,
    p.data_type,
    p.ordinal_position,
    r.routine_type
FROM information_schema.parameters p
JOIN information_schema.routines r ON p.specific_name = r.specific_name
WHERE r.routine_name = 'create_investment_offer_with_fee'
ORDER BY r.specific_name, p.ordinal_position;

