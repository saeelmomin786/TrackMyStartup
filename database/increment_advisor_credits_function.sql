-- =====================================================
-- FUNCTION TO INCREMENT ADVISOR CREDITS
-- This function bypasses RLS using SECURITY DEFINER
-- =====================================================

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

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_advisor_credits(UUID, INTEGER, DECIMAL, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_advisor_credits(UUID, INTEGER, DECIMAL, VARCHAR) TO anon;
