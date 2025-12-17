-- =====================================================
-- BACKUP ALL EXISTING RLS POLICIES
-- =====================================================
-- Run this BEFORE running FIX_ALL_RLS_POLICIES_DYNAMIC.sql
-- This creates a backup table with all current policies
-- =====================================================

-- Create backup table
CREATE TABLE IF NOT EXISTS public.rls_policies_backup (
    backup_id SERIAL PRIMARY KEY,
    backup_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    schemaname TEXT,
    tablename TEXT,
    policyname TEXT,
    permissive TEXT,
    roles TEXT[],
    cmd TEXT,
    qual TEXT,
    with_check TEXT,
    original_sql TEXT
);

-- Clear old backups (optional - comment out if you want to keep all backups)
-- DELETE FROM public.rls_policies_backup;

-- Backup all current policies
INSERT INTO public.rls_policies_backup (
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
)
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
ORDER BY tablename, policyname;

-- Generate restore SQL for each policy
UPDATE public.rls_policies_backup
SET original_sql = format(
    'CREATE POLICY %I ON public.%I FOR %s TO %s%s%s;',
    policyname,
    tablename,
    cmd,
    array_to_string(roles, ', '),
    CASE WHEN qual IS NOT NULL THEN format(' USING (%s)', qual) ELSE '' END,
    CASE WHEN with_check IS NOT NULL THEN format(' WITH CHECK (%s)', with_check) ELSE '' END
)
WHERE schemaname = 'public';

-- Show backup summary
SELECT 
    '✅ BACKUP COMPLETE' as status,
    COUNT(*) as policies_backed_up,
    COUNT(DISTINCT tablename) as tables_backed_up,
    MAX(backup_timestamp) as backup_time
FROM public.rls_policies_backup
WHERE backup_timestamp = (SELECT MAX(backup_timestamp) FROM public.rls_policies_backup);




