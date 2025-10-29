-- Diagnose co-investment opportunity creation issues
-- This will help identify why co-investment creation is failing

-- 1. Check if co_investment_opportunities table exists
SELECT 
    'table_exists' as check_type,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'co_investment_opportunities'
    ) as table_exists;

-- 2. Check table structure if it exists
SELECT 
    'table_structure' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'co_investment_opportunities'
ORDER BY ordinal_position;

-- 3. Check if stage columns exist
SELECT 
    'stage_columns' as check_type,
    column_name
FROM information_schema.columns 
WHERE table_name = 'co_investment_opportunities'
AND column_name IN ('stage', 'lead_investor_advisor_approval_status', 'startup_advisor_approval_status', 'startup_approval_status');

-- 4. Check foreign key constraints
SELECT 
    'foreign_keys' as check_type,
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='co_investment_opportunities';

-- 5. Test startup lookup by name (this is what the co-investment code does)
SELECT 
    'startup_lookup_test' as check_type,
    id,
    name
FROM startups
WHERE name = 'Track My Startup_Startup'
LIMIT 1;

-- 6. Check if there are any existing co-investment opportunities
SELECT 
    'existing_opportunities' as check_type,
    COUNT(*) as total_opportunities
FROM co_investment_opportunities;

-- 7. Test inserting a sample co-investment opportunity
-- (This will show the exact error if there is one)
DO $$
DECLARE
    test_startup_id INTEGER;
    test_user_id UUID;
    opportunity_id INTEGER;
BEGIN
    -- Get a test startup ID
    SELECT id INTO test_startup_id FROM startups LIMIT 1;
    
    -- Get a test user ID
    SELECT id INTO test_user_id FROM users WHERE role = 'Investor' LIMIT 1;
    
    IF test_startup_id IS NOT NULL AND test_user_id IS NOT NULL THEN
        -- Try to insert a test opportunity
        INSERT INTO co_investment_opportunities (
            startup_id,
            listed_by_user_id,
            listed_by_type,
            investment_amount,
            equity_percentage,
            minimum_co_investment,
            maximum_co_investment,
            description,
            status,
            stage,
            lead_investor_advisor_approval_status,
            startup_advisor_approval_status,
            startup_approval_status
        ) VALUES (
            test_startup_id,
            test_user_id,
            'Investor',
            1000000.00,
            10.00,
            100000.00,
            500000.00,
            'Test co-investment opportunity',
            'active',
            1,
            'not_required',
            'not_required',
            'pending'
        ) RETURNING id INTO opportunity_id;
        
        RAISE NOTICE 'Test co-investment opportunity created successfully with ID: %', opportunity_id;
        
        -- Clean up the test record
        DELETE FROM co_investment_opportunities WHERE id = opportunity_id;
        RAISE NOTICE 'Test record cleaned up';
    ELSE
        RAISE NOTICE 'Could not find test startup or user for testing';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating test co-investment opportunity: %', SQLERRM;
END $$;



