-- =====================================================
-- MIGRATE ALL RLS POLICIES TO USE user_profiles (V3 - Fixed)
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This script fixes the issue where "FROM users" wasn't replaced in EXISTS clauses
-- It uses a more comprehensive approach to replace all users table references

DO $$
DECLARE
    policy_record RECORD;
    new_qual TEXT;
    new_with_check TEXT;
    updated_count INTEGER := 0;
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
              -- Include policies that have any users table references
              (qual IS NOT NULL AND (
                  qual ILIKE '%FROM users%'
                  OR qual ILIKE '%JOIN users%'
                  OR qual ILIKE '%users.id%'
                  OR qual ILIKE '%users.role%'
                  OR qual ILIKE '%users.ca_code%'
                  OR qual ILIKE '%users.cs_code%'
                  OR qual ILIKE '%public.users%'
              ))
              OR (with_check IS NOT NULL AND (
                  with_check ILIKE '%FROM users%'
                  OR with_check ILIKE '%JOIN users%'
                  OR with_check ILIKE '%users.id%'
                  OR with_check ILIKE '%users.role%'
                  OR with_check ILIKE '%users.ca_code%'
                  OR with_check ILIKE '%users.cs_code%'
                  OR with_check ILIKE '%public.users%'
              ))
          )
        ORDER BY tablename, policyname
    LOOP
        -- Initialize new expressions
        new_qual := policy_record.qual;
        new_with_check := policy_record.with_check;
        
        -- =====================================================
        -- Step 1: Replace all "FROM users" with "FROM public.user_profiles"
        -- This must be done FIRST before other replacements
        -- =====================================================
        IF new_qual IS NOT NULL THEN
            -- Replace FROM users (with any whitespace)
            new_qual := regexp_replace(new_qual, 
                '\bFROM\s+users\b', 
                'FROM public.user_profiles',
                'gi');
        END IF;
        
        IF new_with_check IS NOT NULL THEN
            new_with_check := regexp_replace(new_with_check, 
                '\bFROM\s+users\b', 
                'FROM public.user_profiles',
                'gi');
        END IF;
        
        -- =====================================================
        -- Step 2: Replace users.id with auth_user_id
        -- =====================================================
        IF new_qual IS NOT NULL THEN
            -- Replace users.id = auth.uid() (simple case)
            new_qual := regexp_replace(new_qual, 
                '\busers\.id\s*=\s*auth\.uid\(\)', 
                'auth_user_id = auth.uid()',
                'gi');
            
            -- Replace (users.id)::text = (auth.uid())::text
            new_qual := regexp_replace(new_qual, 
                '\(users\.id\)::text\s*=\s*\(auth\.uid\(\)\)::text', 
                '(auth_user_id)::text = (auth.uid())::text',
                'gi');
            
            -- Replace users.id in WHERE clauses (general case)
            new_qual := regexp_replace(new_qual, 
                '\busers\.id\b', 
                'auth_user_id',
                'gi');
        END IF;
        
        IF new_with_check IS NOT NULL THEN
            new_with_check := regexp_replace(new_with_check, 
                '\busers\.id\s*=\s*auth\.uid\(\)', 
                'auth_user_id = auth.uid()',
                'gi');
            
            new_with_check := regexp_replace(new_with_check, 
                '\(users\.id\)::text\s*=\s*\(auth\.uid\(\)\)::text', 
                '(auth_user_id)::text = (auth.uid())::text',
                'gi');
            
            new_with_check := regexp_replace(new_with_check, 
                '\busers\.id\b', 
                'auth_user_id',
                'gi');
        END IF;
        
        -- =====================================================
        -- Step 3: Replace users.role with role
        -- =====================================================
        IF new_qual IS NOT NULL THEN
            new_qual := regexp_replace(new_qual, 
                '\busers\.role\b', 
                'role',
                'gi');
        END IF;
        
        IF new_with_check IS NOT NULL THEN
            new_with_check := regexp_replace(new_with_check, 
                '\busers\.role\b', 
                'role',
                'gi');
        END IF;
        
        -- =====================================================
        -- Step 4: Replace users.ca_code with ca_code
        -- =====================================================
        IF new_qual IS NOT NULL THEN
            new_qual := regexp_replace(new_qual, 
                '\busers\.ca_code\b', 
                'ca_code',
                'gi');
        END IF;
        
        IF new_with_check IS NOT NULL THEN
            new_with_check := regexp_replace(new_with_check, 
                '\busers\.ca_code\b', 
                'ca_code',
                'gi');
        END IF;
        
        -- =====================================================
        -- Step 5: Replace users.cs_code with cs_code
        -- =====================================================
        IF new_qual IS NOT NULL THEN
            new_qual := regexp_replace(new_qual, 
                '\busers\.cs_code\b', 
                'cs_code',
                'gi');
        END IF;
        
        IF new_with_check IS NOT NULL THEN
            new_with_check := regexp_replace(new_with_check, 
                '\busers\.cs_code\b', 
                'cs_code',
                'gi');
        END IF;
        
        -- =====================================================
        -- Step 6: Add ORDER BY created_at DESC LIMIT 1 to subqueries
        -- This ensures we get the most recent profile
        -- =====================================================
        IF new_qual IS NOT NULL THEN
            -- Add ORDER BY LIMIT to subqueries that don't have it
            -- Pattern: FROM public.user_profiles WHERE auth_user_id = auth.uid()) without ORDER BY
            new_qual := regexp_replace(new_qual, 
                '(FROM\s+public\.user_profiles\s+WHERE\s+auth_user_id\s*=\s*auth\.uid\(\))\s*\)', 
                '\1 ORDER BY created_at DESC LIMIT 1)',
                'gi');
        END IF;
        
        IF new_with_check IS NOT NULL THEN
            new_with_check := regexp_replace(new_with_check, 
                '(FROM\s+public\.user_profiles\s+WHERE\s+auth_user_id\s*=\s*auth\.uid\(\))\s*\)', 
                '\1 ORDER BY created_at DESC LIMIT 1)',
                'gi');
        END IF;
        
        -- =====================================================
        -- Update the policy
        -- =====================================================
        BEGIN
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
            
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠️  Error updating policy %.%: %', policy_record.tablename, policy_record.policyname, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== MIGRATION SUMMARY ===';
    RAISE NOTICE 'Policies updated: %', updated_count;
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
               OR (pp.qual ILIKE '%users%' AND pp.qual NOT ILIKE '%user_profiles%')
           ))
           OR (pp.with_check IS NOT NULL AND (
               pp.with_check ILIKE '%FROM users%'
               OR pp.with_check ILIKE '%JOIN users%'
               OR (pp.with_check ILIKE '%users%' AND pp.with_check NOT ILIKE '%user_profiles%')
           ))
       )) as remaining_policies,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies pp
              WHERE schemaname = 'public'
                AND (
                    (pp.qual IS NOT NULL AND (
                        pp.qual ILIKE '%FROM users%'
                        OR pp.qual ILIKE '%JOIN users%'
                        OR (pp.qual ILIKE '%users%' AND pp.qual NOT ILIKE '%user_profiles%')
                    ))
                    OR (pp.with_check IS NOT NULL AND (
                        pp.with_check ILIKE '%FROM users%'
                        OR pp.with_check ILIKE '%JOIN users%'
                        OR (pp.with_check ILIKE '%users%' AND pp.with_check NOT ILIKE '%user_profiles%')
                    ))
                )) = 0 
        THEN '✅ ALL RLS POLICIES MIGRATED TO user_profiles'
        ELSE '❌ SOME RLS POLICIES STILL REFERENCE users TABLE'
    END as final_status;

