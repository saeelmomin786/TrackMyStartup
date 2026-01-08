-- Verification Queries to Check for Co-Investment Approval Function Issues
-- Run these queries FIRST to verify if there are actual issues in your database

-- ============================================================================
-- QUERY 1: Check if the approval functions exist and their signatures
-- ============================================================================
SELECT 
    routine_name,
    routine_type,
    data_type as return_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN (
        'approve_lead_investor_advisor_co_investment',
        'approve_startup_advisor_co_investment',
        'approve_startup_co_investment'
    )
ORDER BY routine_name;

-- ============================================================================
-- QUERY 2: Check the actual function source code for bugs
-- This will show if functions are setting 'approve'/'reject' instead of 'approved'/'rejected'
-- ============================================================================
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname IN (
    'approve_lead_investor_advisor_co_investment',
    'approve_startup_advisor_co_investment',
    'approve_startup_co_investment'
)
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- ============================================================================
-- QUERY 3: Check if there are co-investment opportunities with WRONG status values
-- Look for 'approve' or 'reject' (wrong) instead of 'approved' or 'rejected' (correct)
-- ============================================================================
SELECT 
    id,
    stage,
    lead_investor_advisor_approval_status,
    startup_advisor_approval_status,
    startup_approval_status,
    status,
    created_at
FROM public.co_investment_opportunities
WHERE 
    lead_investor_advisor_approval_status IN ('approve', 'reject')
    OR startup_advisor_approval_status IN ('approve', 'reject')
    OR startup_approval_status IN ('approve', 'reject')
ORDER BY created_at DESC;

-- ============================================================================
-- QUERY 4: Check table schema - verify column types and constraints
-- ============================================================================
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'co_investment_opportunities'
    AND column_name IN (
        'stage',
        'lead_investor_advisor_approval_status',
        'startup_advisor_approval_status',
        'startup_approval_status'
    )
ORDER BY ordinal_position;

-- ============================================================================
-- QUERY 5: Check for CHECK constraints on approval status columns
-- ============================================================================
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.co_investment_opportunities'::regclass
    AND conname IN (
        'chk_lead_investor_advisor_status',
        'chk_startup_advisor_status',
        'chk_startup_approval_status'
    );

-- ============================================================================
-- QUERY 6: Count co-investment opportunities by status to see current state
-- ============================================================================
SELECT 
    stage,
    lead_investor_advisor_approval_status,
    startup_advisor_approval_status,
    startup_approval_status,
    COUNT(*) as count
FROM public.co_investment_opportunities
GROUP BY 
    stage,
    lead_investor_advisor_approval_status,
    startup_advisor_approval_status,
    startup_approval_status
ORDER BY stage, lead_investor_advisor_approval_status;

-- ============================================================================
-- QUERY 7: Check if functions return correct types (should be JSON)
-- ============================================================================
SELECT 
    p.proname as function_name,
    pg_catalog.pg_get_function_result(p.oid) as return_type,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
    AND p.proname IN (
        'approve_lead_investor_advisor_co_investment',
        'approve_startup_advisor_co_investment',
        'approve_startup_co_investment'
    )
ORDER BY p.proname;

-- ============================================================================
-- SUMMARY QUERY: Quick check for all potential issues
-- ============================================================================
SELECT 
    'Functions Exist' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 3 THEN '✅ All 3 functions exist'
        WHEN COUNT(*) = 0 THEN '❌ No functions found - need to create'
        ELSE '⚠️ Only ' || COUNT(*) || ' functions found - may be missing some'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN (
        'approve_lead_investor_advisor_co_investment',
        'approve_startup_advisor_co_investment',
        'approve_startup_co_investment'
    )

UNION ALL

SELECT 
    'Wrong Status Values' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No wrong status values found'
        ELSE '❌ Found ' || COUNT(*) || ' records with wrong status values (approve/reject instead of approved/rejected)'
    END as status
FROM public.co_investment_opportunities
WHERE 
    lead_investor_advisor_approval_status IN ('approve', 'reject')
    OR startup_advisor_approval_status IN ('approve', 'reject')
    OR startup_approval_status IN ('approve', 'reject')

UNION ALL

SELECT 
    'Table Columns' as check_type,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) = 4 THEN '✅ All required columns exist'
        ELSE '⚠️ Only ' || COUNT(*) || ' columns found - may be missing some'
    END as status
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'co_investment_opportunities'
    AND column_name IN (
        'stage',
        'lead_investor_advisor_approval_status',
        'startup_advisor_approval_status',
        'startup_approval_status'
    );

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
-- 1. Run all queries above in your Supabase SQL Editor
-- 2. Check the results:
--    - Query 1 & 2: Shows if functions exist and their code
--    - Query 3: Shows if there are records with WRONG status values
--    - Query 4: Shows table schema
--    - Query 5: Shows constraints
--    - Query 6: Shows distribution of status values
--    - Query 7: Shows function signatures
--    - Summary: Quick overview of all issues
--
-- 3. If you see:
--    - Functions with 'approve'/'reject' in their code → ISSUE FOUND
--    - Records with 'approve'/'reject' status values → ISSUE FOUND
--    - Missing functions → Need to create them
--    - Wrong return types → ISSUE FOUND
--
-- 4. If issues are found, then run FIX_CO_INVESTMENT_APPROVAL_FUNCTIONS.sql





