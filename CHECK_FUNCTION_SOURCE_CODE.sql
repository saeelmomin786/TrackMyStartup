-- Check the actual function source code to see if they have the bug
-- This will show if functions are setting 'approve'/'reject' directly instead of 'approved'/'rejected'

SELECT 
    proname as function_name,
    CASE 
        -- Check if function sets approval_status directly from p_approval_action (BUG)
        WHEN pg_get_functiondef(oid) LIKE '%lead_investor_advisor_approval_status = p_approval_action%' 
            OR pg_get_functiondef(oid) LIKE '%startup_advisor_approval_status = p_approval_action%'
            OR pg_get_functiondef(oid) LIKE '%startup_approval_status = p_approval_action%'
        THEN '❌ BUG FOUND: Function sets status directly from p_approval_action (will set approve/reject instead of approved/rejected)'
        
        -- Check if function uses the correct 'approved'/'rejected' values
        WHEN pg_get_functiondef(oid) LIKE '%approval_status = ''approved''%'
            OR pg_get_functiondef(oid) LIKE '%approval_status = ''rejected''%'
            OR pg_get_functiondef(oid) LIKE '%approval_status = new_status%' -- where new_status is set to 'approved'/'rejected'
        THEN '✅ CORRECT: Function uses approved/rejected values'
        
        ELSE '⚠️ UNKNOWN: Cannot determine from source code - need manual inspection'
    END as bug_status,
    -- Show a snippet of the function code for manual inspection
    substring(pg_get_functiondef(oid) from 1 for 500) as function_code_snippet
FROM pg_proc
WHERE proname IN (
    'approve_lead_investor_advisor_co_investment',
    'approve_startup_advisor_co_investment',
    'approve_startup_co_investment'
)
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- Also show the full function definition for each function
SELECT 
    proname as function_name,
    'Full Function Definition' as type,
    pg_get_functiondef(oid) as full_definition
FROM pg_proc
WHERE proname IN (
    'approve_lead_investor_advisor_co_investment',
    'approve_startup_advisor_co_investment',
    'approve_startup_co_investment'
)
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;





