-- =====================================================
-- TRACK MY STARTUP REPORTS - VERIFICATION SCRIPT
-- =====================================================
-- Run this to verify the Reports section is fully configured
-- Execute in Supabase SQL Editor

-- 1. Verify all 4 tables exist
SELECT 
    'reports' as table_name,
    COUNT(*) as row_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'reports'
UNION ALL
SELECT 
    'report_questions' as table_name,
    COUNT(*) as row_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'report_questions'
UNION ALL
SELECT 
    'report_responses' as table_name,
    COUNT(*) as row_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'report_responses'
UNION ALL
SELECT 
    'report_answers' as table_name,
    COUNT(*) as row_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'report_answers';

-- 2. Check table structure - reports
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'reports'
ORDER BY ordinal_position;

-- 3. Check table structure - report_questions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'report_questions'
ORDER BY ordinal_position;

-- 4. Check table structure - report_responses
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'report_responses'
ORDER BY ordinal_position;

-- 5. Check table structure - report_answers
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'report_answers'
ORDER BY ordinal_position;

-- 6. Verify indexes exist
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND (tablename IN ('reports', 'report_questions', 'report_responses', 'report_answers'))
ORDER BY tablename, indexname;

-- 7. Verify RLS is enabled
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('reports', 'report_questions', 'report_responses', 'report_answers');

-- 8. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('reports', 'report_questions', 'report_responses', 'report_answers');

-- 9. Verify foreign key relationships
SELECT 
    constraint_name,
    table_name,
    column_name,
    foreign_table_name,
    foreign_column_name
FROM information_schema.referential_constraints rc
JOIN information_schema.key_column_usage kcu 
    ON rc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON rc.unique_constraint_name = ccu.constraint_name
WHERE table_schema = 'public'
AND table_name IN ('report_questions', 'report_responses', 'report_answers');

-- 10. Verify triggers exist
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('report_responses', 'report_answers');

-- 11. Sample data check (if any reports exist)
SELECT 
    'Reports Created' as metric,
    COUNT(*) as count
FROM public.reports;

-- 12. Check facilitator access (sample)
-- This should only return reports where facilitator is the current user
-- Uncomment and run with a specific facilitator_id
-- SELECT * FROM public.reports WHERE facilitator_id = 'YOUR_FACILITATOR_ID';

-- 13. Summary report
SELECT 
    'Backend Configuration' as category,
    'Tables Created' as component,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reports')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'report_questions')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'report_responses')
        AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'report_answers')
        THEN '✅ ALL TABLES EXIST'
        ELSE '❌ MISSING TABLES'
    END as status
UNION ALL
SELECT 
    'Backend Configuration',
    'RLS Enabled',
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_tables 
              WHERE schemaname = 'public' 
              AND tablename IN ('reports', 'report_questions', 'report_responses', 'report_answers')
              AND rowsecurity = true) = 4
        THEN '✅ RLS ENABLED ON ALL'
        ELSE '❌ RLS NOT FULLY ENABLED'
    END
UNION ALL
SELECT 
    'Backend Configuration',
    'Indexes Created',
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_indexes 
              WHERE schemaname = 'public' 
              AND tablename IN ('reports', 'report_questions', 'report_responses', 'report_answers')) >= 10
        THEN '✅ INDEXES CREATED'
        ELSE '⚠️ CHECK INDEXES'
    END
UNION ALL
SELECT 
    'Backend Configuration',
    'Triggers Setup',
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.triggers 
              WHERE trigger_schema = 'public'
              AND event_object_table IN ('report_responses', 'report_answers')) >= 2
        THEN '✅ TRIGGERS CONFIGURED'
        ELSE '⚠️ CHECK TRIGGERS'
    END;

-- =====================================================
-- END OF VERIFICATION SCRIPT
-- =====================================================
-- All checks should show ✅ for a fully configured system
