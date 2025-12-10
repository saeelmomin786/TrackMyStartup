-- =====================================================
-- VERIFY FUNDRAISING DYNAMIC VALIDATION SETUP
-- =====================================================
-- Run this after FIX_FUNDRAISING_DYNAMIC_VALIDATION.sql
-- to verify everything is set up correctly

-- 1. Verify functions exist
SELECT 
    routine_name,
    routine_type,
    CASE 
        WHEN routine_name = 'validate_fundraising_type' THEN '✅ Type validation'
        WHEN routine_name = 'validate_fundraising_domain' THEN '✅ Domain validation'
        WHEN routine_name = 'validate_fundraising_stage' THEN '✅ Stage validation'
        ELSE '❓ Unknown'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN (
        'validate_fundraising_type',
        'validate_fundraising_domain',
        'validate_fundraising_stage'
    )
ORDER BY routine_name;

-- 2. Verify triggers exist
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    CASE 
        WHEN trigger_name = 'validate_fundraising_type_trigger' THEN '✅ Type validation trigger'
        WHEN trigger_name = 'validate_fundraising_domain_trigger' THEN '✅ Domain validation trigger'
        WHEN trigger_name = 'validate_fundraising_stage_trigger' THEN '✅ Stage validation trigger'
        WHEN trigger_name LIKE '%updated_at%' THEN '✅ Timestamp trigger (existing)'
        ELSE '❓ Other trigger'
    END as status
FROM information_schema.triggers
WHERE event_object_table = 'fundraising_details'
ORDER BY trigger_name;

-- 3. Verify CHECK constraints are removed
SELECT 
    conname,
    pg_get_constraintdef(oid) as constraint_definition,
    CASE 
        WHEN conname LIKE '%type_check%' THEN '❌ Should be removed (replaced by trigger)'
        WHEN conname LIKE '%domain_check%' THEN '❌ Should be removed (replaced by trigger)'
        WHEN conname LIKE '%stage_check%' THEN '❌ Should be removed (replaced by trigger)'
        ELSE '✅ Other constraint (OK)'
    END as status
FROM pg_constraint 
WHERE conrelid = 'fundraising_details'::regclass
    AND contype = 'c'  -- CHECK constraints only
ORDER BY conname;

-- 4. Check available values in general_data
SELECT 
    category,
    COUNT(*) as active_count,
    STRING_AGG(name, ', ' ORDER BY display_order) as active_values
FROM general_data
WHERE category IN ('round_type', 'domain', 'stage')
    AND is_active = true
GROUP BY category
ORDER BY category;

-- 5. Test: Try to insert with valid values (should work)
DO $$
DECLARE
    test_startup_id INTEGER;
BEGIN
    -- Get a real startup_id for testing (or use 999 as placeholder)
    SELECT COALESCE((SELECT id FROM startups LIMIT 1), 999) INTO test_startup_id;
    
    -- Test with valid type from general_data
    BEGIN
        INSERT INTO fundraising_details (startup_id, active, type, value, equity, validation_requested)
        VALUES (test_startup_id, true, 'Seed', 5000000, 15, false);
        
        RAISE NOTICE '✅ Test 1 PASSED: Valid type (Seed) accepted';
        
        -- Clean up
        DELETE FROM fundraising_details WHERE startup_id = test_startup_id AND type = 'Seed';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Test 1 FAILED: %', SQLERRM;
    END;
    
    -- Test with invalid type (should fail)
    BEGIN
        INSERT INTO fundraising_details (startup_id, active, type, value, equity, validation_requested)
        VALUES (test_startup_id, true, 'INVALID_TYPE_TEST', 5000000, 15, false);
        
        RAISE NOTICE '❌ Test 2 FAILED: Invalid type was accepted (should have been rejected)';
        
        -- Clean up if somehow it worked
        DELETE FROM fundraising_details WHERE startup_id = test_startup_id AND type = 'INVALID_TYPE_TEST';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%Invalid fundraising type%' THEN
            RAISE NOTICE '✅ Test 2 PASSED: Invalid type correctly rejected - %', SQLERRM;
        ELSE
            RAISE NOTICE '⚠️ Test 2: Unexpected error - %', SQLERRM;
        END IF;
    END;
    
END $$;

-- 6. Summary
SELECT 
    '✅ Setup Complete!' as status,
    'Validation functions and triggers are active' as message,
    'Try inserting/updating fundraising_details to test' as next_step;

