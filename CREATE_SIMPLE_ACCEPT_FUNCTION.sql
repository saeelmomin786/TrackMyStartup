-- CREATE_SIMPLE_ACCEPT_FUNCTION.sql
-- This script creates a simplified version of the accept function to bypass the scouting fee issue

-- 1. Create a simple accept function without scouting fee calculation
CREATE OR REPLACE FUNCTION accept_investment_offer_simple(
    p_offer_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    offer_record RECORD;
BEGIN
    -- Get the offer details
    SELECT * INTO offer_record FROM public.investment_offers WHERE id = p_offer_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Offer with ID % not found', p_offer_id;
    END IF;
    
    -- Update the offer status to accepted
    UPDATE public.investment_offers 
    SET status = 'accepted',
        contact_details_revealed = TRUE,
        contact_details_revealed_at = NOW()
    WHERE id = p_offer_id;
    
    -- Log the activity
    INSERT INTO public.investment_ledger (offer_id, activity_type, amount, description)
    VALUES (p_offer_id, 'offer_accepted', offer_record.offer_amount, 'Investment offer accepted by startup');
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant execute permission
GRANT EXECUTE ON FUNCTION accept_investment_offer_simple(INTEGER) TO authenticated;

-- 3. Test the simple function
SELECT '=== TESTING SIMPLE ACCEPT FUNCTION ===' as info;
SELECT accept_investment_offer_simple(37) as test_result;

-- 4. Verify the offer was updated
SELECT '=== VERIFYING OFFER UPDATE ===' as info;
SELECT 
    id,
    investor_email,
    startup_name,
    offer_amount,
    equity_percentage,
    status,
    contact_details_revealed,
    contact_details_revealed_at
FROM investment_offers
WHERE id = 37;
<<<<<<< HEAD

=======
>>>>>>> aba79bbb99c116b96581e88ab62621652ed6a6b7
