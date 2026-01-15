-- Fix approve_co_investment_offer_investor_advisor function
-- This ensures the function correctly queries co_investment_offers table and handles errors properly

-- Drop existing function if it exists (in case it has wrong signature or queries wrong table)
DROP FUNCTION IF EXISTS public.approve_co_investment_offer_investor_advisor(INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.approve_co_investment_offer_investor_advisor(TEXT);
DROP FUNCTION IF EXISTS public.approve_co_investment_offer_investor_advisor(INTEGER, VARCHAR);

-- Create the correct function that queries co_investment_offers table
CREATE OR REPLACE FUNCTION public.approve_co_investment_offer_investor_advisor(
    p_offer_id INTEGER,
    p_approval_action TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    offer_record RECORD;
    new_status TEXT;
BEGIN
    -- Validate action parameter
    IF p_approval_action IS NULL OR p_approval_action NOT IN ('approve', 'reject') THEN
        RAISE EXCEPTION 'Invalid approval action. Must be "approve" or "reject", got: %', COALESCE(p_approval_action, 'NULL');
    END IF;
    
    -- Validate offer_id parameter
    IF p_offer_id IS NULL OR p_offer_id <= 0 THEN
        RAISE EXCEPTION 'Invalid offer ID. Must be a positive integer, got: %', p_offer_id;
    END IF;
    
    -- Get offer details from co_investment_offers table
    SELECT * INTO offer_record 
    FROM public.co_investment_offers 
    WHERE id = p_offer_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Co-investment offer with ID % not found', p_offer_id;
    END IF;
    
    -- Check if this is the right stage for investor advisor approval
    -- Allow approval if status is pending_investor_advisor_approval OR if investor_advisor_approval_status is pending
    IF offer_record.status != 'pending_investor_advisor_approval' 
       AND offer_record.investor_advisor_approval_status != 'pending' THEN
        RAISE EXCEPTION 'Offer is not in pending investor advisor approval status. Current status: %, advisor_status: %', 
            offer_record.status, offer_record.investor_advisor_approval_status;
    END IF;
    
    -- Update approval status
    IF p_approval_action = 'approve' THEN
        -- Move to lead investor approval
        new_status := 'pending_lead_investor_approval';
        
        UPDATE public.co_investment_offers 
        SET 
            investor_advisor_approval_status = 'approved',
            investor_advisor_approval_at = NOW(),
            status = new_status,
            updated_at = NOW()
        WHERE id = p_offer_id;
    ELSE
        -- Reject the offer
        new_status := 'investor_advisor_rejected';
        
        UPDATE public.co_investment_offers 
        SET 
            investor_advisor_approval_status = 'rejected',
            investor_advisor_approval_at = NOW(),
            status = new_status,
            updated_at = NOW()
        WHERE id = p_offer_id;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Investor advisor approval processed successfully',
        'offer_id', p_offer_id,
        'action', p_approval_action,
        'new_status', new_status,
        'updated_at', NOW()
    );
EXCEPTION
    WHEN OTHERS THEN
        -- Return error details in JSON format
        RAISE EXCEPTION 'Error processing investor advisor approval: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.approve_co_investment_offer_investor_advisor(INTEGER, TEXT) TO authenticated;

-- Verify the function was created correctly
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'approve_co_investment_offer_investor_advisor'
        AND pg_get_function_arguments(p.oid) = 'p_offer_id integer, p_approval_action text'
    ) THEN
        RAISE NOTICE '✅ Function approve_co_investment_offer_investor_advisor created successfully';
    ELSE
        RAISE EXCEPTION '❌ Function approve_co_investment_offer_investor_advisor was not created correctly';
    END IF;
END $$;
