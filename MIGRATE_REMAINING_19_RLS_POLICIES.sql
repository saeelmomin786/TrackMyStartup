-- =====================================================
-- MIGRATE REMAINING 19 RLS POLICIES
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This fixes the remaining patterns:
-- 1. SELECT users.email FROM users
-- 2. SELECT users.startup_name FROM users
-- 3. SELECT users.investor_code FROM users
-- 4. SELECT users.mentor_code FROM users
-- 5. users.email = (auth.jwt() ->> 'email'::text)

DO $$
DECLARE
    policy_record RECORD;
    new_qual TEXT;
    new_with_check TEXT;
    updated_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    -- Loop through the remaining policies
    FOR policy_record IN 
        SELECT 
            tablename,
            policyname,
            cmd,
            qual,
            with_check
        FROM pg_policies
        WHERE schemaname = 'public'
          AND (
              (qual IS NOT NULL AND (
                  qual ILIKE '%FROM users%'
                  OR qual ILIKE '%users.email%'
                  OR qual ILIKE '%users.startup_name%'
                  OR qual ILIKE '%users.investor_code%'
                  OR qual ILIKE '%users.mentor_code%'
              ))
              OR (with_check IS NOT NULL AND (
                  with_check ILIKE '%FROM users%'
                  OR with_check ILIKE '%users.email%'
                  OR with_check ILIKE '%users.startup_name%'
                  OR with_check ILIKE '%users.investor_code%'
                  OR with_check ILIKE '%users.mentor_code%'
              ))
          )
        ORDER BY tablename, policyname
    LOOP
        BEGIN
            -- Initialize new expressions
            new_qual := policy_record.qual;
            new_with_check := policy_record.with_check;
            
            -- =====================================================
            -- Replace remaining patterns using regex for whitespace handling
            -- =====================================================
            IF new_qual IS NOT NULL THEN
                -- Replace SELECT users.email FROM users (with any whitespace)
                new_qual := regexp_replace(new_qual, 
                    'SELECT\s+users\.email\s+FROM\s+users', 
                    'SELECT email FROM public.user_profiles',
                    'gi');
                
                -- Replace SELECT users.startup_name FROM users (with any whitespace)
                new_qual := regexp_replace(new_qual, 
                    'SELECT\s+users\.startup_name\s+FROM\s+users', 
                    'SELECT startup_name FROM public.user_profiles',
                    'gi');
                
                -- Replace SELECT users.investor_code FROM users (with any whitespace)
                new_qual := regexp_replace(new_qual, 
                    'SELECT\s+users\.investor_code\s+FROM\s+users', 
                    'SELECT investor_code FROM public.user_profiles',
                    'gi');
                
                -- Replace SELECT users.mentor_code FROM users (with any whitespace)
                new_qual := regexp_replace(new_qual, 
                    'SELECT\s+users\.mentor_code\s+FROM\s+users', 
                    'SELECT mentor_code FROM public.user_profiles',
                    'gi');
                
                -- Replace users.email = (auth.jwt() ->> 'email'::text)
                new_qual := REPLACE(new_qual, 'users.email = (auth.jwt() ->> ''email''::text)', 'email = (auth.jwt() ->> ''email''::text)');
                
                -- Replace any remaining FROM users
                new_qual := regexp_replace(new_qual, '\bFROM\s+users\b', 'FROM public.user_profiles', 'gi');
                
                -- Replace users.role
                new_qual := regexp_replace(new_qual, '\busers\.role\b', 'role', 'gi');
                
                -- Replace users.email (general case)
                new_qual := regexp_replace(new_qual, '\busers\.email\b', 'email', 'gi');
                
                -- Replace users.startup_name (general case)
                new_qual := regexp_replace(new_qual, '\busers\.startup_name\b', 'startup_name', 'gi');
                
                -- Replace users.investor_code (general case)
                new_qual := regexp_replace(new_qual, '\busers\.investor_code\b', 'investor_code', 'gi');
                
                -- Replace users.mentor_code (general case)
                new_qual := regexp_replace(new_qual, '\busers\.mentor_code\b', 'mentor_code', 'gi');
                
                -- Add ORDER BY LIMIT to subqueries that need it (for email-based lookups)
                new_qual := regexp_replace(new_qual, 
                    '(FROM\s+public\.user_profiles\s+WHERE\s+email\s*=\s*\(auth\.jwt\(\)\s*->>\s*''email''::text\))\s*\)', 
                    '\1 ORDER BY created_at DESC LIMIT 1)',
                    'gi');
                
                -- Also add ORDER BY LIMIT for WHERE clauses that check auth_user_id (if not already present)
                new_qual := regexp_replace(new_qual, 
                    '(FROM\s+public\.user_profiles\s+WHERE\s+auth_user_id\s*=\s*auth\.uid\(\))\s*\)(?!\s+ORDER\s+BY)', 
                    '\1 ORDER BY created_at DESC LIMIT 1)',
                    'gi');
            END IF;
            
            IF new_with_check IS NOT NULL THEN
                -- Same replacements for with_check using regex
                new_with_check := regexp_replace(new_with_check, 
                    'SELECT\s+users\.email\s+FROM\s+users', 
                    'SELECT email FROM public.user_profiles',
                    'gi');
                new_with_check := regexp_replace(new_with_check, 
                    'SELECT\s+users\.startup_name\s+FROM\s+users', 
                    'SELECT startup_name FROM public.user_profiles',
                    'gi');
                new_with_check := regexp_replace(new_with_check, 
                    'SELECT\s+users\.investor_code\s+FROM\s+users', 
                    'SELECT investor_code FROM public.user_profiles',
                    'gi');
                new_with_check := regexp_replace(new_with_check, 
                    'SELECT\s+users\.mentor_code\s+FROM\s+users', 
                    'SELECT mentor_code FROM public.user_profiles',
                    'gi');
                new_with_check := REPLACE(new_with_check, 'users.email = (auth.jwt() ->> ''email''::text)', 'email = (auth.jwt() ->> ''email''::text)');
                new_with_check := regexp_replace(new_with_check, '\bFROM\s+users\b', 'FROM public.user_profiles', 'gi');
                new_with_check := regexp_replace(new_with_check, '\busers\.role\b', 'role', 'gi');
                new_with_check := regexp_replace(new_with_check, '\busers\.email\b', 'email', 'gi');
                new_with_check := regexp_replace(new_with_check, '\busers\.startup_name\b', 'startup_name', 'gi');
                new_with_check := regexp_replace(new_with_check, '\busers\.investor_code\b', 'investor_code', 'gi');
                new_with_check := regexp_replace(new_with_check, '\busers\.mentor_code\b', 'mentor_code', 'gi');
                new_with_check := regexp_replace(new_with_check, 
                    '(FROM\s+public\.user_profiles\s+WHERE\s+email\s*=\s*\(auth\.jwt\(\)\s*->>\s*''email''::text\))\s*\)', 
                    '\1 ORDER BY created_at DESC LIMIT 1)',
                    'gi');
                
                -- Also add ORDER BY LIMIT for WHERE clauses that check auth_user_id (if not already present)
                new_with_check := regexp_replace(new_with_check, 
                    '(FROM\s+public\.user_profiles\s+WHERE\s+auth_user_id\s*=\s*auth\.uid\(\))\s*\)(?!\s+ORDER\s+BY)', 
                    '\1 ORDER BY created_at DESC LIMIT 1)',
                    'gi');
            END IF;
            
            -- Only update if expressions actually changed
            IF (new_qual IS DISTINCT FROM policy_record.qual) OR (new_with_check IS DISTINCT FROM policy_record.with_check) THEN
                -- Drop existing policy
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 
                    policy_record.policyname, 
                    policy_record.tablename);
                
                -- Recreate policy with new expressions
                IF new_qual IS NOT NULL AND new_with_check IS NOT NULL THEN
                    EXECUTE format('CREATE POLICY %I ON public.%I FOR %s USING (%s) WITH CHECK (%s)', 
                        policy_record.policyname,
                        policy_record.tablename,
                        policy_record.cmd,
                        new_qual,
                        new_with_check);
                ELSIF new_qual IS NOT NULL THEN
                    EXECUTE format('CREATE POLICY %I ON public.%I FOR %s USING (%s)', 
                        policy_record.policyname,
                        policy_record.tablename,
                        policy_record.cmd,
                        new_qual);
                ELSIF new_with_check IS NOT NULL THEN
                    EXECUTE format('CREATE POLICY %I ON public.%I FOR %s WITH CHECK (%s)', 
                        policy_record.policyname,
                        policy_record.tablename,
                        policy_record.cmd,
                        new_with_check);
                END IF;
                
                updated_count := updated_count + 1;
                RAISE NOTICE '✅ Updated policy: %.%', policy_record.tablename, policy_record.policyname;
            ELSE
                RAISE NOTICE '⚠️  No changes for policy: %.%', policy_record.tablename, policy_record.policyname;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                RAISE NOTICE '❌ Error updating policy %.%: %', 
                    policy_record.tablename, policy_record.policyname, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== MIGRATION SUMMARY ===';
    RAISE NOTICE 'Policies updated: %', updated_count;
    RAISE NOTICE 'Errors: %', error_count;
    RAISE NOTICE '✅ Remaining RLS policies migration complete!';
END $$;

-- Verify migration
SELECT 
    '=== VERIFICATION ===' as status,
    (SELECT COUNT(*) FROM pg_policies pp
     WHERE schemaname = 'public'
       AND (
           (pp.qual IS NOT NULL AND (
               pp.qual ILIKE '%FROM users%'
               OR pp.qual ILIKE '%users.email%'
               OR pp.qual ILIKE '%users.startup_name%'
               OR pp.qual ILIKE '%users.investor_code%'
               OR pp.qual ILIKE '%users.mentor_code%'
               OR pp.qual ILIKE '%users.role%'
           ))
           OR (pp.with_check IS NOT NULL AND (
               pp.with_check ILIKE '%FROM users%'
               OR pp.with_check ILIKE '%users.email%'
               OR pp.with_check ILIKE '%users.startup_name%'
               OR pp.with_check ILIKE '%users.investor_code%'
               OR pp.with_check ILIKE '%users.mentor_code%'
               OR pp.with_check ILIKE '%users.role%'
           ))
       )) as remaining_policies,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies pp
              WHERE schemaname = 'public'
                AND (
                    (pp.qual IS NOT NULL AND (
                        pp.qual ILIKE '%FROM users%'
                        OR pp.qual ILIKE '%users.email%'
                        OR pp.qual ILIKE '%users.startup_name%'
                        OR pp.qual ILIKE '%users.investor_code%'
                        OR pp.qual ILIKE '%users.mentor_code%'
                        OR pp.qual ILIKE '%users.role%'
                    ))
                    OR (pp.with_check IS NOT NULL AND (
                        pp.with_check ILIKE '%FROM users%'
                        OR pp.with_check ILIKE '%users.email%'
                        OR pp.with_check ILIKE '%users.startup_name%'
                        OR pp.with_check ILIKE '%users.investor_code%'
                        OR pp.with_check ILIKE '%users.mentor_code%'
                        OR pp.with_check ILIKE '%users.role%'
                    ))
                )) = 0 
        THEN '✅ ALL RLS POLICIES MIGRATED TO user_profiles'
        ELSE '❌ SOME RLS POLICIES STILL REFERENCE users TABLE'
    END as final_status;

