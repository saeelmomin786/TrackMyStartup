-- =====================================================
-- CHECK RLS POLICIES FOR investment_offers
-- =====================================================
-- Verify if Investment Advisors can view offers from their assigned investors
-- =====================================================

-- Check current RLS policies
SELECT 
    'Current RLS Policies' as check_type,
    policyname,
    cmd,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investment_offers'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT 
    'RLS Status' as check_type,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'investment_offers';

-- Check if there's a policy for Investment Advisors
SELECT 
    'Investment Advisor Policy Check' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'investment_offers'
            AND (qual LIKE '%Investment Advisor%' OR qual LIKE '%investment_advisor%' OR qual LIKE '%advisor%')
        ) THEN '✅ Policy exists'
        ELSE '❌ No policy found for Investment Advisors'
    END as status;

-- Check sample data to understand structure
SELECT 
    'Sample Data' as check_type,
    COUNT(*) as total_offers,
    COUNT(DISTINCT investor_email) as unique_investors,
    COUNT(DISTINCT startup_id) as unique_startups,
    COUNT(CASE WHEN stage IN (1, 2, 4) THEN 1 END) as offers_at_stages_1_2_4
FROM public.investment_offers;

-- Check if offers have investor_email that matches advisor's investors
SELECT 
    'Offers by Stage' as check_type,
    stage,
    COUNT(*) as offer_count
FROM public.investment_offers
GROUP BY stage
ORDER BY stage;





