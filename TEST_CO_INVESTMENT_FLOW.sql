-- Test Co-Investment Flow Database Setup
-- This script verifies that all co-investment tables and functions are properly set up

-- 1. Check if co-investment tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('co_investment_opportunities', 'co_investment_interests', 'co_investment_approvals') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'co_investment%'
ORDER BY table_name;

-- 2. Check table structures
SELECT 
    'co_investment_opportunities' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'co_investment_opportunities'
ORDER BY ordinal_position;

-- 3. Check if RPC functions exist
SELECT 
    routine_name,
    CASE 
        WHEN routine_name IN ('create_co_investment_opportunity', 'get_all_co_investment_opportunities', 'express_co_investment_interest') 
        THEN '✅ EXISTS' 
        ELSE '❌ MISSING' 
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%co_investment%'
ORDER BY routine_name;

-- 4. Test creating a sample co-investment opportunity (if tables exist)
-- This will only work if the tables are properly set up
DO $$
DECLARE
    test_startup_id INTEGER;
    test_user_id UUID;
    opportunity_id INTEGER;
BEGIN
    -- Get a sample startup and user for testing
    SELECT id INTO test_startup_id FROM startups LIMIT 1;
    SELECT id INTO test_user_id FROM users WHERE role = 'Investor' LIMIT 1;
    
    IF test_startup_id IS NOT NULL AND test_user_id IS NOT NULL THEN
        -- Try to create a test co-investment opportunity
        BEGIN
            INSERT INTO co_investment_opportunities (
                startup_id,
                listed_by_user_id,
                listed_by_type,
                investment_amount,
                equity_percentage,
                minimum_co_investment,
                maximum_co_investment,
                description,
                status
            ) VALUES (
                test_startup_id,
                test_user_id,
                'Investor',
                1000000.00,
                10.00,
                50000.00,
                500000.00,
                'Test co-investment opportunity for testing purposes',
                'active'
            ) RETURNING id INTO opportunity_id;
            
            RAISE NOTICE '✅ Test co-investment opportunity created with ID: %', opportunity_id;
            
            -- Clean up test data
            DELETE FROM co_investment_opportunities WHERE id = opportunity_id;
            RAISE NOTICE '✅ Test data cleaned up';
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ Error creating test co-investment opportunity: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '⚠️ No test data available (startup or investor not found)';
    END IF;
END $$;

-- 5. Check investment_offers table for co-investment fields
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'investment_offers'
AND column_name IN ('wants_co_investment', 'seeking_co_investment', 'total_investment_amount')
ORDER BY column_name;

-- 6. Summary
SELECT 
    'Database Setup Summary' as summary,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'co_investment_opportunities')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'co_investment_interests')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'co_investment_approvals')
        THEN '✅ All co-investment tables exist'
        ELSE '❌ Some co-investment tables are missing'
    END as status;

