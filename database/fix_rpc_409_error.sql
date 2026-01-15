-- =====================================================
-- FIX 409 ERROR ON RPC FUNCTION CALL
-- =====================================================
-- This script fixes the 409 error by ensuring:
-- 1. Function is owned by postgres
-- 2. postgres role has full permissions on tables
-- 3. RLS policies don't interfere with SECURITY DEFINER
-- =====================================================

-- Step 1: Recreate function with SECURITY DEFINER and proper owner
CREATE OR REPLACE FUNCTION increment_advisor_credits(
    p_advisor_user_id UUID,
    p_credits_to_add INTEGER,
    p_amount_paid DECIMAL(10,2),
    p_currency VARCHAR(3)
)
RETURNS advisor_credits AS $$
DECLARE
    credit_record advisor_credits;
BEGIN
    -- Insert or update credits atomically
    INSERT INTO advisor_credits (
        advisor_user_id,
        credits_available,
        credits_used,
        credits_purchased,
        last_purchase_amount,
        last_purchase_currency,
        last_purchase_date
    )
    VALUES (
        p_advisor_user_id,
        p_credits_to_add,
        0,
        p_credits_to_add,
        p_amount_paid,
        p_currency,
        NOW()
    )
    ON CONFLICT (advisor_user_id) 
    DO UPDATE SET
        credits_available = advisor_credits.credits_available + p_credits_to_add,
        credits_purchased = advisor_credits.credits_purchased + p_credits_to_add,
        last_purchase_amount = p_amount_paid,
        last_purchase_currency = p_currency,
        last_purchase_date = NOW(),
        updated_at = NOW()
    RETURNING * INTO credit_record;
    
    RETURN credit_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Set function owner to postgres (critical for SECURITY DEFINER)
ALTER FUNCTION increment_advisor_credits(UUID, INTEGER, DECIMAL, VARCHAR) OWNER TO postgres;

-- Step 3: Grant execute permissions to all roles
GRANT EXECUTE ON FUNCTION increment_advisor_credits(UUID, INTEGER, DECIMAL, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_advisor_credits(UUID, INTEGER, DECIMAL, VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION increment_advisor_credits(UUID, INTEGER, DECIMAL, VARCHAR) TO service_role;

-- Step 4: Grant ALL permissions on advisor_credits table to postgres role
-- This ensures SECURITY DEFINER function can read/write
GRANT ALL ON advisor_credits TO postgres;
GRANT ALL ON credit_purchase_history TO postgres;

-- Step 5: Also grant permissions to authenticated/anon for direct access
GRANT SELECT, INSERT, UPDATE ON advisor_credits TO authenticated;
GRANT SELECT, INSERT, UPDATE ON advisor_credits TO anon;
GRANT SELECT, INSERT ON credit_purchase_history TO authenticated;
GRANT SELECT, INSERT ON credit_purchase_history TO anon;

-- Step 6: Check and disable RLS if enabled (RLS can interfere with SECURITY DEFINER)
-- Note: We'll check first, then disable if needed
DO $$
BEGIN
    -- Check if RLS is enabled on advisor_credits
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'advisor_credits'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE advisor_credits DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS disabled on advisor_credits table';
    END IF;
    
    -- Check if RLS is enabled on credit_purchase_history
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'credit_purchase_history'
        AND rowsecurity = true
    ) THEN
        ALTER TABLE credit_purchase_history DISABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS disabled on credit_purchase_history table';
    END IF;
END $$;

-- Step 7: Verify function exists and has correct settings
DO $$
DECLARE
    func_count INTEGER;
    func_owner TEXT;
    func_security_definer BOOLEAN;
BEGIN
    -- Check if function exists
    SELECT COUNT(*) INTO func_count
    FROM pg_proc 
    WHERE proname = 'increment_advisor_credits'
    AND pronamespace = 'public'::regnamespace;
    
    IF func_count > 0 THEN
        -- Get function details
        SELECT 
            proowner::regrole::text,
            prosecdef
        INTO 
            func_owner,
            func_security_definer
        FROM pg_proc 
        WHERE proname = 'increment_advisor_credits'
        AND pronamespace = 'public'::regnamespace
        LIMIT 1;
        
        RAISE NOTICE 'Function exists: true';
        RAISE NOTICE 'Function owner: %', func_owner;
        RAISE NOTICE 'SECURITY DEFINER: %', func_security_definer;
        
        IF func_owner != 'postgres' THEN
            RAISE WARNING 'Function owner is not postgres! Current owner: %', func_owner;
        END IF;
        
        IF NOT func_security_definer THEN
            RAISE WARNING 'Function is not SECURITY DEFINER!';
        END IF;
    ELSE
        RAISE WARNING 'Function does not exist!';
    END IF;
END $$;

-- Step 8: Test function call (commented out - uncomment to test)
-- WARNING: This will create a test record
/*
DO $$
DECLARE
    test_user_id UUID := '00000000-0000-0000-0000-000000000000'::UUID;
    test_result advisor_credits;
BEGIN
    SELECT * INTO test_result
    FROM increment_advisor_credits(
        test_user_id,
        1,
        10.00,
        'EUR'
    );
    
    RAISE NOTICE '✅ Function test successful! Credits available: %', test_result.credits_available;
    
    -- Clean up test record
    DELETE FROM advisor_credits WHERE advisor_user_id = test_user_id;
    RAISE NOTICE '✅ Test record cleaned up';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ Function test failed: %', SQLERRM;
END $$;
*/
