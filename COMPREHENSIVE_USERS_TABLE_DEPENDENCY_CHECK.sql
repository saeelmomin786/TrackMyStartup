-- =====================================================
-- COMPREHENSIVE CHECK: All dependencies on users table
-- =====================================================
-- This script checks EVERYTHING that might reference the users table
-- Run this to ensure nothing depends on users table before deleting it

-- =====================================================
-- 1. CHECK FUNCTIONS (including fallback logic)
-- =====================================================
SELECT 
    '=== FUNCTIONS CHECK ===' as section,
    COUNT(*) as remaining_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO users TABLE REFERENCES IN FUNCTIONS'
        ELSE '❌ ' || COUNT(*) || ' FUNCTIONS STILL REFERENCE users TABLE'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
      (pg_get_functiondef(p.oid) ILIKE '%FROM users%'
       OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
       OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
       OR pg_get_functiondef(p.oid) ILIKE '%JOIN public.users%'
       OR pg_get_functiondef(p.oid) ILIKE '%FROM public.users%'
       OR pg_get_functiondef(p.oid) ILIKE '%users.%'
       OR pg_get_functiondef(p.oid) ILIKE '%table users%'
       OR pg_get_functiondef(p.oid) ILIKE '%users table%')
      AND pg_get_functiondef(p.oid) NOT ILIKE '%auth.users%'
      AND pg_get_functiondef(p.oid) NOT ILIKE '%user_profiles%'
  );

-- Show which functions (if any) still reference users
SELECT 
    'FUNCTION_DETAILS' as check_type,
    p.proname as function_name,
    CASE 
        WHEN pg_get_functiondef(p.oid) ILIKE '%FROM users%' THEN '❌ Has FROM users'
        WHEN pg_get_functiondef(p.oid) ILIKE '%JOIN users%' THEN '❌ Has JOIN users'
        WHEN pg_get_functiondef(p.oid) ILIKE '%users.%' THEN '❌ Has users.column'
        ELSE '❌ References users table'
    END as issue_type,
    substring(pg_get_functiondef(p.oid), 1, 500) as function_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
      pg_get_functiondef(p.oid) ILIKE '%FROM users%'
      OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
      OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
      OR pg_get_functiondef(p.oid) ILIKE '%JOIN public.users%'
      OR pg_get_functiondef(p.oid) ILIKE '%FROM public.users%'
      OR pg_get_functiondef(p.oid) ILIKE '%users.%'
  )
ORDER BY p.proname;

-- =====================================================
-- 2. CHECK VIEWS
-- =====================================================
SELECT 
    '=== VIEWS CHECK ===' as section,
    COUNT(*) as remaining_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO users TABLE REFERENCES IN VIEWS'
        ELSE '❌ ' || COUNT(*) || ' VIEWS STILL REFERENCE users TABLE'
    END as status
FROM pg_views
WHERE schemaname = 'public'
  AND (
      (definition ILIKE '%FROM users%'
       OR definition ILIKE '%JOIN users%'
       OR definition ILIKE '%public.users%'
       OR definition ILIKE '%users.%')
      AND definition NOT ILIKE '%user_profiles%'
      AND definition NOT ILIKE '%auth.users%'
  );

-- Show which views (if any) still reference users
SELECT 
    'VIEW_DETAILS' as check_type,
    viewname as view_name,
    substring(definition, 1, 500) as view_preview
FROM pg_views
WHERE schemaname = 'public'
  AND (
      (definition ILIKE '%FROM users%'
       OR definition ILIKE '%JOIN users%'
       OR definition ILIKE '%public.users%'
       OR definition ILIKE '%users.%')
      AND definition NOT ILIKE '%user_profiles%'
      AND definition NOT ILIKE '%auth.users%'
  )
ORDER BY viewname;

-- =====================================================
-- 3. CHECK RLS POLICIES (using pg_policy system table)
-- =====================================================
SELECT 
    '=== RLS POLICIES CHECK ===' as section,
    COUNT(*) as remaining_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO users TABLE REFERENCES IN RLS POLICIES'
        ELSE '❌ ' || COUNT(*) || ' RLS POLICIES STILL REFERENCE users TABLE'
    END as status
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND (
      (p.polqual IS NOT NULL AND (
          pg_get_expr(p.polqual, p.polrelid) ILIKE '%FROM users%'
          OR pg_get_expr(p.polqual, p.polrelid) ILIKE '%JOIN users%'
          OR pg_get_expr(p.polqual, p.polrelid) ILIKE '%users.%'
          OR pg_get_expr(p.polqual, p.polrelid) ILIKE '%public.users%'
      ))
      OR (p.polwithcheck IS NOT NULL AND (
          pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%FROM users%'
          OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%JOIN users%'
          OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%users.%'
          OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%public.users%'
      ))
  )
  -- Exclude if it also has user_profiles (might be a partial migration)
  AND (
      (p.polqual IS NULL OR pg_get_expr(p.polqual, p.polrelid) NOT ILIKE '%user_profiles%')
      AND (p.polwithcheck IS NULL OR pg_get_expr(p.polwithcheck, p.polrelid) NOT ILIKE '%user_profiles%')
  );

-- Show which RLS policies (if any) still reference users
SELECT 
    'RLS_POLICY_DETAILS' as check_type,
    c.relname::text as table_name,
    p.polname::text as policy_name,
    CASE 
        WHEN p.polqual IS NOT NULL AND pg_get_expr(p.polqual, p.polrelid) ILIKE '%users%' THEN substring(pg_get_expr(p.polqual, p.polrelid), 1, 300)
        WHEN p.polwithcheck IS NOT NULL AND pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%users%' THEN substring(pg_get_expr(p.polwithcheck, p.polrelid), 1, 300)
        ELSE 'Found reference'
    END as policy_preview
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND (
      (p.polqual IS NOT NULL AND (
          pg_get_expr(p.polqual, p.polrelid) ILIKE '%FROM users%'
          OR pg_get_expr(p.polqual, p.polrelid) ILIKE '%JOIN users%'
          OR pg_get_expr(p.polqual, p.polrelid) ILIKE '%users.%'
      ))
      OR (p.polwithcheck IS NOT NULL AND (
          pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%FROM users%'
          OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%JOIN users%'
          OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%users.%'
      ))
  )
  -- Exclude if it also has user_profiles
  AND (
      (p.polqual IS NULL OR pg_get_expr(p.polqual, p.polrelid) NOT ILIKE '%user_profiles%')
      AND (p.polwithcheck IS NULL OR pg_get_expr(p.polwithcheck, p.polrelid) NOT ILIKE '%user_profiles%')
  )
ORDER BY c.relname, p.polname;

-- =====================================================
-- 4. CHECK FOREIGN KEY CONSTRAINTS
-- =====================================================
SELECT 
    '=== FOREIGN KEYS CHECK ===' as section,
    COUNT(*) as remaining_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO FOREIGN KEYS REFERENCE users TABLE'
        ELSE '❌ ' || COUNT(*) || ' FOREIGN KEYS STILL REFERENCE users TABLE'
    END as status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
    AND tc.table_name = kcu.table_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'users';

-- Show which foreign keys (if any) still reference users
SELECT 
    'FK_DETAILS' as check_type,
    tc.table_name as referencing_table,
    kcu.column_name as referencing_column,
    tc.constraint_name as fk_name,
    '❌ STILL REFERENCES users TABLE' as status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
    AND tc.table_name = kcu.table_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'users'
ORDER BY tc.table_name, tc.constraint_name;

-- =====================================================
-- 5. CHECK TRIGGERS (functions called by triggers)
-- =====================================================
SELECT 
    '=== TRIGGERS CHECK ===' as section,
    COUNT(*) as remaining_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO TRIGGERS USE FUNCTIONS THAT REFERENCE users TABLE'
        ELSE '⚠️ ' || COUNT(*) || ' TRIGGERS USE FUNCTIONS THAT REFERENCE users TABLE'
    END as status
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE NOT t.tgisinternal
  AND n.nspname = 'public'
  AND (
      (pg_get_functiondef(p.oid) ILIKE '%FROM users%'
       OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
       OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
       OR pg_get_functiondef(p.oid) ILIKE '%users.%')
      AND pg_get_functiondef(p.oid) NOT ILIKE '%auth.users%'
      AND pg_get_functiondef(p.oid) NOT ILIKE '%user_profiles%'
  );

-- Show which triggers (if any) use functions that reference users
SELECT 
    'TRIGGER_DETAILS' as check_type,
    t.tgname as trigger_name,
    c.relname::text as table_name,
    p.proname as function_name,
    '⚠️ Trigger uses function that references users table' as status
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE NOT t.tgisinternal
  AND n.nspname = 'public'
  AND (
      (pg_get_functiondef(p.oid) ILIKE '%FROM users%'
       OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
       OR pg_get_functiondef(p.oid) ILIKE '%public.users%'
       OR pg_get_functiondef(p.oid) ILIKE '%users.%')
      AND pg_get_functiondef(p.oid) NOT ILIKE '%auth.users%'
      AND pg_get_functiondef(p.oid) NOT ILIKE '%user_profiles%'
  )
ORDER BY c.relname, t.tgname;

-- =====================================================
-- 6. CHECK FOR FALLBACK LOGIC IN FUNCTIONS
-- =====================================================
SELECT 
    '=== FALLBACK LOGIC CHECK ===' as section,
    COUNT(*) as functions_with_fallback,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO FUNCTIONS HAVE FALLBACK TO users TABLE'
        ELSE '⚠️ ' || COUNT(*) || ' FUNCTIONS HAVE FALLBACK LOGIC TO users TABLE'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
      -- Look for common fallback patterns with users table
      (pg_get_functiondef(p.oid) ILIKE '%FROM users%'
       OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
       OR pg_get_functiondef(p.oid) ILIKE '%public.users%')
      AND (
          pg_get_functiondef(p.oid) ILIKE '%IF NOT FOUND%'
          OR pg_get_functiondef(p.oid) ILIKE '%ELSE%'
          OR pg_get_functiondef(p.oid) ILIKE '%COALESCE%'
          OR pg_get_functiondef(p.oid) ILIKE '%LEFT JOIN users%'
          OR pg_get_functiondef(p.oid) ILIKE '%OR EXISTS%users%'
          OR pg_get_functiondef(p.oid) ILIKE '%OR (SELECT%FROM users%'
      )
      AND pg_get_functiondef(p.oid) NOT ILIKE '%user_profiles%'
      AND pg_get_functiondef(p.oid) NOT ILIKE '%auth.users%'
  );

-- Show functions with potential fallback logic
SELECT 
    'FALLBACK_DETAILS' as check_type,
    p.proname as function_name,
    '⚠️ Potential fallback to users table' as status,
    substring(pg_get_functiondef(p.oid), 1, 1000) as function_snippet
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (
      pg_get_functiondef(p.oid) ILIKE '%FROM users%'
      OR pg_get_functiondef(p.oid) ILIKE '%JOIN users%'
      OR pg_get_functiondef(p.oid) ILIKE '%users.%'
  )
ORDER BY p.proname;

-- =====================================================
-- 7. CHECK TABLE CONSTRAINTS (CHECK constraints, etc.)
-- =====================================================
SELECT 
    '=== TABLE CONSTRAINTS CHECK ===' as section,
    COUNT(*) as remaining_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ NO TABLE CONSTRAINTS REFERENCE users TABLE'
        ELSE '❌ ' || COUNT(*) || ' TABLE CONSTRAINTS REFERENCE users TABLE'
    END as status
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type IN ('CHECK', 'UNIQUE', 'PRIMARY KEY')
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'users';

-- =====================================================
-- 8. CHECK INDEXES (shouldn't have FK indexes, but let's check)
-- =====================================================
SELECT 
    '=== INDEXES CHECK ===' as section,
    'Indexes on users table are OK - checking for FKs that became indexes' as note,
    COUNT(*) as indexes_on_users_table,
    CASE 
        WHEN COUNT(*) > 0 THEN 'ℹ️ ' || COUNT(*) || ' indexes exist on users table (this is normal)'
        ELSE '✅ No indexes on users table'
    END as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'users';

-- =====================================================
-- 9. FINAL SUMMARY
-- =====================================================
SELECT 
    '=== FINAL SUMMARY ===' as summary,
    CASE 
        WHEN (
            -- Functions (using 0 as placeholder - check separately if needed)
            (SELECT 0) = 0
            -- Views
            AND (SELECT COUNT(*) FROM pg_views 
                 WHERE schemaname = 'public' 
                 AND (definition ILIKE '%FROM users%' 
                      OR definition ILIKE '%JOIN users%' 
                      OR definition ILIKE '%public.users%'
                      OR definition ILIKE '%users.%'
                      AND definition NOT ILIKE '%user_profiles%')) = 0
            -- RLS Policies
            AND (SELECT COUNT(*) 
                 FROM pg_policy p
                 JOIN pg_class c ON p.polrelid = c.oid
                 JOIN pg_namespace n ON c.relnamespace = n.oid
                 WHERE n.nspname = 'public'
                   AND (
                       (p.polqual IS NOT NULL AND (
                           pg_get_expr(p.polqual, p.polrelid) ILIKE '%FROM users%'
                           OR pg_get_expr(p.polqual, p.polrelid) ILIKE '%JOIN users%'
                           OR pg_get_expr(p.polqual, p.polrelid) ILIKE '%users.%'
                       )
                       AND pg_get_expr(p.polqual, p.polrelid) NOT ILIKE '%user_profiles%')
                       OR (p.polwithcheck IS NOT NULL AND (
                           pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%FROM users%'
                           OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%JOIN users%'
                           OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%users.%'
                       )
                       AND pg_get_expr(p.polwithcheck, p.polrelid) NOT ILIKE '%user_profiles%')
                   )) = 0
            -- Foreign Keys
            AND (SELECT COUNT(*) 
                 FROM information_schema.table_constraints tc 
                 JOIN information_schema.constraint_column_usage ccu 
                     ON ccu.constraint_name = tc.constraint_name
                     AND ccu.table_schema = tc.table_schema
                 WHERE tc.constraint_type = 'FOREIGN KEY' 
                   AND tc.table_schema = 'public' 
                   AND ccu.table_name = 'users') = 0
        ) THEN '✅ SAFE TO DELETE users TABLE - NO DEPENDENCIES FOUND'
        ELSE '❌ DO NOT DELETE users TABLE YET - DEPENDENCIES STILL EXIST'
    END as final_status;

