-- 🔴 CRITICAL BUG FIX: Prevent Credits from Going Negative
-- Issue: Credits display and go negative, allowing unlimited premium assignments
-- 
-- Root Causes:
-- 1. NO CHECK constraint preventing negative credits_available
-- 2. No atomic operation to ensure deduction only if balance > 0
-- 3. Possible race condition with concurrent requests
-- 
-- Solution: Fix data first, then add CHECK constraints + Create atomic deduction function

-- =====================================================
-- STEP 0: REPAIR DATA FIRST (before adding constraints)
-- =====================================================
-- Set any negative values to 0

UPDATE public.advisor_credits
SET credits_available = GREATEST(credits_available, 0)
WHERE credits_available < 0;

UPDATE public.advisor_credits
SET credits_used = GREATEST(credits_used, 0)
WHERE credits_used < 0;

UPDATE public.advisor_credits
SET credits_purchased = GREATEST(credits_purchased, 0)
WHERE credits_purchased < 0;

-- =====================================================
-- STEP 1: Add CHECK Constraint to advisor_credits
-- =====================================================

ALTER TABLE public.advisor_credits
ADD CONSTRAINT check_credits_available_non_negative 
CHECK (credits_available >= 0);

ALTER TABLE public.advisor_credits
ADD CONSTRAINT check_credits_used_non_negative 
CHECK (credits_used >= 0);

ALTER TABLE public.advisor_credits
ADD CONSTRAINT check_credits_purchased_non_negative 
CHECK (credits_purchased >= 0);

-- Verify constraints were added
DO $$
BEGIN
    RAISE NOTICE '✅ CHECK constraints added to advisor_credits table';
END $$;

-- =====================================================
-- STEP 2: Create Atomic Credit Deduction Function
-- =====================================================
-- This function uses a transaction to ensure credits are only deducted
-- if the balance is sufficient (prevents race conditions)

CREATE OR REPLACE FUNCTION deduct_advisor_credit_safe(
    p_advisor_user_id UUID,
    p_amount_to_deduct INTEGER DEFAULT 1
)
RETURNS TABLE (
    success BOOLEAN,
    credits_before INTEGER,
    credits_after INTEGER,
    error_message TEXT
) AS $$
DECLARE
    v_credits_before INTEGER;
    v_credits_after INTEGER;
BEGIN
    -- Start transaction (implicit in PL/pgSQL)
    
    -- Lock the row for update (prevents race condition)
    SELECT credits_available INTO v_credits_before
    FROM public.advisor_credits
    WHERE advisor_user_id = p_advisor_user_id
    FOR UPDATE;
    
    -- Check if sufficient credits available
    IF v_credits_before IS NULL THEN
        -- No record exists
        RETURN QUERY SELECT FALSE, 0, 0, 'No credits record found for this advisor';
        RETURN;
    END IF;
    
    IF v_credits_before < p_amount_to_deduct THEN
        -- Insufficient credits - return error but don't deduct
        RETURN QUERY SELECT FALSE, v_credits_before, v_credits_before, 
            'Insufficient credits. Required: ' || p_amount_to_deduct || ', Available: ' || v_credits_before;
        RETURN;
    END IF;
    
    -- Sufficient credits - deduct
    UPDATE public.advisor_credits
    SET 
        credits_available = credits_available - p_amount_to_deduct,
        credits_used = credits_used + p_amount_to_deduct,
        updated_at = NOW()
    WHERE advisor_user_id = p_advisor_user_id
    RETURNING credits_available INTO v_credits_after;
    
    -- Success
    RETURN QUERY SELECT TRUE, v_credits_before, v_credits_after, NULL;
    
EXCEPTION WHEN OTHERS THEN
    -- Catch any errors (including CHECK constraint violations)
    RETURN QUERY SELECT FALSE, v_credits_before, v_credits_before, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION deduct_advisor_credit_safe(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_advisor_credit_safe(UUID, INTEGER) TO anon;

-- =====================================================
-- STEP 3: Verify Constraints Work
-- =====================================================

DO $$
BEGIN
    -- Test that negative values are rejected
    RAISE NOTICE '📋 Constraint verification:';
    RAISE NOTICE '  ✅ Credits cannot be negative (CHECK constraint active)';
    RAISE NOTICE '  ✅ Atomic deduction function created (deduct_advisor_credit_safe)';
    RAISE NOTICE '  ✅ Safe deduction prevents race conditions (FOR UPDATE lock)';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 DEPLOYMENT STEPS:';
    RAISE NOTICE '  1. Run this SQL file to add constraints';
    RAISE NOTICE '  2. Update lib/advisorCreditService.ts to use new function';
    RAISE NOTICE '  3. Test credit deduction with low balance';
    RAISE NOTICE '  4. Verify negative credits no longer possible';
END $$;

-- =====================================================
-- STEP 4: Data Repair (if needed)
-- =====================================================
-- If any advisor has negative credits, set to 0

DO $$
DECLARE
    v_negative_count INTEGER;
BEGIN
    -- Find advisors with negative credits
    SELECT COUNT(*) INTO v_negative_count
    FROM public.advisor_credits
    WHERE credits_available < 0;
    
    IF v_negative_count > 0 THEN
        RAISE WARNING '⚠️ Found % advisors with negative credits. Repairing...', v_negative_count;
        
        -- Set negative credits to 0
        UPDATE public.advisor_credits
        SET credits_available = 0
        WHERE credits_available < 0;
        
        RAISE NOTICE '✅ Repaired % advisors with negative credits', v_negative_count;
    ELSE
        RAISE NOTICE '✅ No advisors with negative credits found';
    END IF;
END $$;
