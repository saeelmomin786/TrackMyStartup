-- Test and debug approve_co_investment_offer_investor_advisor function
-- Run this to verify the function exists and works correctly

-- 1. Check if function exists
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type,
    CASE 
        WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN 'YES'
        ELSE 'NO'
    END AS authenticated_can_execute
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'approve_co_investment_offer_investor_advisor';

-- 2. Check for co-investment offers pending investor advisor approval
SELECT 
    id,
    investor_email,
    startup_name,
    status,
    investor_advisor_approval_status,
    lead_investor_approval_status,
    startup_approval_status,
    offer_amount,
    equity_percentage,
    created_at
FROM public.co_investment_offers
WHERE status = 'pending_investor_advisor_approval'
   OR investor_advisor_approval_status = 'pending'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Test the function with a sample offer (replace ID with actual offer ID from above)
-- Uncomment and replace <OFFER_ID> with an actual ID from the query above
/*
SELECT public.approve_co_investment_offer_investor_advisor(
    <OFFER_ID>,  -- Replace with actual offer ID
    'approve'    -- or 'reject'
);
*/

-- 4. Check RLS policies on co_investment_offers table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'co_investment_offers';

-- 5. Verify table exists and has correct structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'co_investment_offers'
ORDER BY ordinal_position;
