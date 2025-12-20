-- =====================================================
-- MIGRATE ALL RLS POLICIES TO USE user_profiles (V4 - Final)
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This version uses a more direct approach: drop and recreate all policies
-- with corrected expressions

DO $$
DECLARE
    policy_record RECORD;
    new_qual TEXT;
    new_with_check TEXT;
    updated_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    -- Loop through all RLS policies that reference users table
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
                  OR qual ILIKE '%JOIN users%'
                  OR qual ILIKE '%users.id%'
                  OR qual ILIKE '%users.role%'
                  OR qual ILIKE '%users.ca_code%'
                  OR qual ILIKE '%users.cs_code%'
              ))
              OR (with_check IS NOT NULL AND (
                  with_check ILIKE '%FROM users%'
                  OR with_check ILIKE '%JOIN users%'
                  OR with_check ILIKE '%users.id%'
                  OR with_check ILIKE '%users.role%'
                  OR with_check ILIKE '%users.ca_code%'
                  OR with_check ILIKE '%users.cs_code%'
              ))
          )
        ORDER BY tablename, policyname
    LOOP
        BEGIN
            -- Initialize new expressions
            new_qual := policy_record.qual;
            new_with_check := policy_record.with_check;
            
            -- =====================================================
            -- Replace all users table references
            -- =====================================================
            IF new_qual IS NOT NULL THEN
                -- Replace FROM users (must be first)
                new_qual := regexp_replace(new_qual, '\bFROM\s+users\b', 'FROM public.user_profiles', 'gi');
                -- Replace users.id
                new_qual := regexp_replace(new_qual, '\busers\.id\b', 'auth_user_id', 'gi');
                -- Replace users.role
                new_qual := regexp_replace(new_qual, '\busers\.role\b', 'role', 'gi');
                -- Replace users.ca_code
                new_qual := regexp_replace(new_qual, '\busers\.ca_code\b', 'ca_code', 'gi');
                -- Replace users.cs_code
                new_qual := regexp_replace(new_qual, '\busers\.cs_code\b', 'cs_code', 'gi');
                -- Add ORDER BY LIMIT to subqueries that need it
                new_qual := regexp_replace(new_qual, 
                    '(FROM\s+public\.user_profiles\s+WHERE\s+auth_user_id\s*=\s*auth\.uid\(\))\s*\)', 
                    '\1 ORDER BY created_at DESC LIMIT 1)',
                    'gi');
            END IF;
            
            IF new_with_check IS NOT NULL THEN
                new_with_check := regexp_replace(new_with_check, '\bFROM\s+users\b', 'FROM public.user_profiles', 'gi');
                new_with_check := regexp_replace(new_with_check, '\busers\.id\b', 'auth_user_id', 'gi');
                new_with_check := regexp_replace(new_with_check, '\busers\.role\b', 'role', 'gi');
                new_with_check := regexp_replace(new_with_check, '\busers\.ca_code\b', 'ca_code', 'gi');
                new_with_check := regexp_replace(new_with_check, '\busers\.cs_code\b', 'cs_code', 'gi');
                new_with_check := regexp_replace(new_with_check, 
                    '(FROM\s+public\.user_profiles\s+WHERE\s+auth_user_id\s*=\s*auth\.uid\(\))\s*\)', 
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
                RAISE NOTICE '⚠️  No changes for policy: %.% (expressions may already be correct or patterns not matching)', 
                    policy_record.tablename, policy_record.policyname;
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
    RAISE NOTICE '✅ RLS policies migration complete!';
END $$;

-- Verify migration
SELECT 
    '=== VERIFICATION ===' as status,
    (SELECT COUNT(*) FROM pg_policies pp
     WHERE schemaname = 'public'
       AND (
           (pp.qual IS NOT NULL AND (
               pp.qual ILIKE '%FROM users%'
               OR pp.qual ILIKE '%JOIN users%'
               OR (pp.qual ILIKE '%users.id%' AND pp.qual NOT ILIKE '%user_profiles%')
               OR (pp.qual ILIKE '%users.role%' AND pp.qual NOT ILIKE '%user_profiles%')
           ))
           OR (pp.with_check IS NOT NULL AND (
               pp.with_check ILIKE '%FROM users%'
               OR pp.with_check ILIKE '%JOIN users%'
               OR (pp.with_check ILIKE '%users.id%' AND pp.with_check NOT ILIKE '%user_profiles%')
               OR (pp.with_check ILIKE '%users.role%' AND pp.with_check NOT ILIKE '%user_profiles%')
           ))
       )) as remaining_policies,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies pp
              WHERE schemaname = 'public'
                AND (
                    (pp.qual IS NOT NULL AND (
                        pp.qual ILIKE '%FROM users%'
                        OR pp.qual ILIKE '%JOIN users%'
                        OR (pp.qual ILIKE '%users.id%' AND pp.qual NOT ILIKE '%user_profiles%')
                        OR (pp.qual ILIKE '%users.role%' AND pp.qual NOT ILIKE '%user_profiles%')
                    ))
                    OR (pp.with_check IS NOT NULL AND (
                        pp.with_check ILIKE '%FROM users%'
                        OR pp.with_check ILIKE '%JOIN users%'
                        OR (pp.with_check ILIKE '%users.id%' AND pp.with_check NOT ILIKE '%user_profiles%')
                        OR (pp.with_check ILIKE '%users.role%' AND pp.with_check NOT ILIKE '%user_profiles%')
                    ))
                )) = 0 
        THEN '✅ ALL RLS POLICIES MIGRATED TO user_profiles'
        ELSE '❌ SOME RLS POLICIES STILL REFERENCE users TABLE'
    END as final_status;



