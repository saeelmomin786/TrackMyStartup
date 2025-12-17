-- =====================================================
-- CHECK IF INVESTOR_FAVORITES TABLE EXISTS AND IS SET UP CORRECTLY
-- =====================================================

-- 1. Check if table exists
SELECT 
    '1. Table Existence Check' as check_section,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'investor_favorites'
        ) THEN '✅ Table EXISTS'
        ELSE '❌ Table DOES NOT EXIST - Run CREATE_INVESTOR_FAVORITES_TABLE.sql'
    END as table_status;

-- 2. Check table structure
SELECT 
    '2. Table Structure Check' as check_section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'investor_favorites'
ORDER BY ordinal_position;

-- 3. Check indexes
SELECT 
    '3. Indexes Check' as check_section,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'investor_favorites';

-- 4. Check RLS is enabled
SELECT 
    '4. RLS Status Check' as check_section,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = 'investor_favorites'
            AND rowsecurity = true
        ) THEN '✅ RLS is ENABLED'
        ELSE '❌ RLS is NOT ENABLED - Run CREATE_INVESTOR_FAVORITES_TABLE.sql'
    END as rls_status;

-- 5. Check RLS policies exist
SELECT 
    '5. RLS Policies Check' as check_section,
    policyname,
    cmd as command_type,
    CASE 
        WHEN qual LIKE '%auth.uid()%' THEN '✅ Uses auth.uid()'
        ELSE '⚠️ Check auth.uid() usage'
    END as auth_check,
    qual as policy_expression
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'investor_favorites'
ORDER BY policyname, cmd;

-- 6. Count existing favorites
SELECT 
    '6. Existing Data Check' as check_section,
    COUNT(*) as total_favorites,
    COUNT(DISTINCT investor_id) as unique_investors,
    COUNT(DISTINCT startup_id) as unique_startups
FROM public.investor_favorites;

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT 
    'SUMMARY' as section,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'investor_favorites'
        ) THEN '✅ Table exists - Ready to use!'
        ELSE '❌ Table missing - Run CREATE_INVESTOR_FAVORITES_TABLE.sql first'
    END as overall_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename = 'investor_favorites'
            AND policyname LIKE '%Investment Advisor%'
        ) THEN '✅ Investment Advisor policies exist'
        ELSE '⚠️ Investment Advisor policies may be missing'
    END as advisor_policy_status;



