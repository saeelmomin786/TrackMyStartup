-- Test the approve_co_investment_offer_investor_advisor function
-- This verifies the function works correctly

-- First, check if there are any co-investment offers pending investor advisor approval
SELECT 
    id,
    investor_email,
    startup_name,
    status,
    investor_advisor_approval_status,
    offer_amount,
    equity_percentage
FROM public.co_investment_offers
WHERE status = 'pending_investor_advisor_approval'
   OR investor_advisor_approval_status = 'pending'
ORDER BY created_at DESC
LIMIT 5;

-- Test calling the function (you'll need to replace the offer_id with an actual ID from above)
-- Example:
-- SELECT public.approve_co_investment_offer_investor_advisor(
--    1,  -- Replace with actual offer_id
--    'approve'  -- or 'reject'
-- );

-- Check function permissions
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    CASE 
        WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN 'YES'
        ELSE 'NO'
    END AS authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'approve_co_investment_offer_investor_advisor';









