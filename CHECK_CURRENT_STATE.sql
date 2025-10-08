-- QUICK DIAGNOSTIC - Check current database state
-- Run this to see what's currently in your database

-- 1. Check if tables exist
SELECT 'TABLE EXISTENCE CHECK:' as check_type;
SELECT 
    table_name,
    CASE WHEN table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM information_schema.tables 
WHERE table_name IN ('opportunity_applications', 'incubation_opportunities')
    AND table_schema = 'public';

-- 2. Count existing records
SELECT 'RECORD COUNTS:' as check_type;
SELECT 
    'opportunity_applications' as table_name,
    COUNT(*) as record_count
FROM public.opportunity_applications
UNION ALL
SELECT 
    'incubation_opportunities' as table_name,
    COUNT(*) as record_count
FROM public.incubation_opportunities;

-- 3. Check current columns in opportunity_applications
SELECT 'CURRENT COLUMNS IN OPPORTUNITY_APPLICATIONS:' as check_type;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'opportunity_applications'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Check if sector column exists (this is the missing one causing the error)
SELECT 'SECTOR COLUMN CHECK:' as check_type;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'opportunity_applications' 
                AND column_name = 'sector'
                AND table_schema = 'public'
        ) THEN 'SECTOR COLUMN EXISTS ✅'
        ELSE 'SECTOR COLUMN MISSING ❌ - THIS IS CAUSING THE 400 ERROR'
    END as sector_status;

-- 5. Check RLS policies
SELECT 'RLS POLICIES CHECK:' as check_type;
SELECT 
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'opportunity_applications'
    AND schemaname = 'public';

-- 6. Test if we can read the table (RLS test)
SELECT 'RLS ACCESS TEST:' as check_type;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.opportunity_applications LIMIT 1) 
        THEN 'CAN READ TABLE ✅'
        ELSE 'CANNOT READ TABLE ❌ - RLS BLOCKING ACCESS'
    END as access_status;

SELECT 'DIAGNOSTIC COMPLETE!' as status;









