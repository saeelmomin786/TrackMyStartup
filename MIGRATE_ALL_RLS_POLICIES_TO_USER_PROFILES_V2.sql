-- =====================================================
-- MIGRATE ALL RLS POLICIES TO USE user_profiles (V2 - Improved)
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This script uses regex_replace for more flexible pattern matching
-- Handles variations in whitespace and formatting

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
              (qual IS NOT NULL AND (qual ILIKE '%users%' OR qual ILIKE '%public.users%'))
              OR (with_check IS NOT NULL AND (with_check ILIKE '%users%' OR with_check ILIKE '%public.users%'))
          )
        ORDER BY tablename, policyname
    LOOP
        -- Initialize new expressions
        new_qual := policy_record.qual;
        new_with_check := policy_record.with_check;
        
        -- =====================================================
        -- Use regex_replace for flexible pattern matching
        -- =====================================================
        
        IF new_qual IS NOT NULL THEN
            -- Replace users.id = auth.uid() (with any whitespace)
            new_qual := regexp_replace(new_qual, 
                'users\.id\s*=\s*auth\.uid\(\)', 
                '(SELECT auth_user_id FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1) = auth.uid()',
                'g');
            
            -- Replace (users.id)::text = (auth.uid())::text
            new_qual := regexp_replace(new_qual, 
                '\(users\.id\)::text\s*=\s*\(auth\.uid\(\)\)::text', 
                '((SELECT auth_user_id FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1))::text = (auth.uid())::text',
                'g');
            
            -- Replace SELECT users.role FROM users WHERE users.id = auth.uid()
            new_qual := regexp_replace(new_qual, 
                '\(SELECT\s+users\.role\s+FROM\s+users\s+WHERE\s+users\.id\s*=\s*auth\.uid\(\)\)', 
                '(SELECT role FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1)',
                'gi');
            
            -- Replace EXISTS (SELECT 1 FROM users WHERE ...)
            new_qual := regexp_replace(new_qual, 
                'EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+users\s+WHERE\s+.*?users\.id\s*=\s*auth\.uid\(\)\s+AND\s+users\.role\s*=\s*''Admin''::user_role\s*\)', 
                'EXISTS (SELECT 1 FROM public.user_profiles WHERE auth_user_id = auth.uid() AND role = ''Admin''::user_role ORDER BY created_at DESC LIMIT 1)',
                'gi');
            
            -- Replace SELECT users.ca_code FROM users WHERE users.id = auth.uid()
            new_qual := regexp_replace(new_qual, 
                '\(SELECT\s+users\.ca_code\s+FROM\s+users\s+WHERE\s+users\.id\s*=\s*auth\.uid\(\)\)', 
                '(SELECT ca_code FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1)',
                'gi');
            
            -- Replace SELECT users.cs_code FROM users WHERE users.id = auth.uid()
            new_qual := regexp_replace(new_qual, 
                '\(SELECT\s+users\.cs_code\s+FROM\s+users\s+WHERE\s+users\.id\s*=\s*auth\.uid\(\)\)', 
                '(SELECT cs_code FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1)',
                'gi');
            
            -- Replace IN (SELECT users.ca_code FROM users WHERE users.id = auth.uid())
            new_qual := regexp_replace(new_qual, 
                'IN\s*\(\s*SELECT\s+users\.ca_code\s+FROM\s+users\s+WHERE\s+users\.id\s*=\s*auth\.uid\(\)\s*\)', 
                'IN (SELECT ca_code FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1)',
                'gi');
            
            -- Replace IN (SELECT users.cs_code FROM users WHERE users.id = auth.uid())
            new_qual := regexp_replace(new_qual, 
                'IN\s*\(\s*SELECT\s+users\.cs_code\s+FROM\s+users\s+WHERE\s+users\.id\s*=\s*auth\.uid\(\)\s*\)', 
                'IN (SELECT cs_code FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1)',
                'gi');
            
            -- Replace FROM users with FROM public.user_profiles (catch-all for any remaining)
            new_qual := regexp_replace(new_qual, 
                '\bFROM\s+users\b', 
                'FROM public.user_profiles',
                'gi');
            
            -- Replace users.id with auth_user_id in user_profiles context
            new_qual := regexp_replace(new_qual, 
                '\busers\.id\b', 
                'auth_user_id',
                'gi');
            
            -- Replace users.role with role in user_profiles context
            new_qual := regexp_replace(new_qual, 
                '\busers\.role\b', 
                'role',
                'gi');
            
            -- Replace users.ca_code with ca_code in user_profiles context
            new_qual := regexp_replace(new_qual, 
                '\busers\.ca_code\b', 
                'ca_code',
                'gi');
            
            -- Replace users.cs_code with cs_code in user_profiles context
            new_qual := regexp_replace(new_qual, 
                '\busers\.cs_code\b', 
                'cs_code',
                'gi');
        END IF;
        
        IF new_with_check IS NOT NULL THEN
            -- Apply same replacements to with_check
            new_with_check := regexp_replace(new_with_check, 
                'users\.id\s*=\s*auth\.uid\(\)', 
                '(SELECT auth_user_id FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1) = auth.uid()',
                'g');
            
            new_with_check := regexp_replace(new_with_check, 
                '\(users\.id\)::text\s*=\s*\(auth\.uid\(\)\)::text', 
                '((SELECT auth_user_id FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1))::text = (auth.uid())::text',
                'g');
            
            new_with_check := regexp_replace(new_with_check, 
                '\(SELECT\s+users\.role\s+FROM\s+users\s+WHERE\s+users\.id\s*=\s*auth\.uid\(\)\)', 
                '(SELECT role FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1)',
                'gi');
            
            new_with_check := regexp_replace(new_with_check, 
                'EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+users\s+WHERE\s+.*?users\.id\s*=\s*auth\.uid\(\)\s+AND\s+users\.role\s*=\s*''Admin''::user_role\s*\)', 
                'EXISTS (SELECT 1 FROM public.user_profiles WHERE auth_user_id = auth.uid() AND role = ''Admin''::user_role ORDER BY created_at DESC LIMIT 1)',
                'gi');
            
            new_with_check := regexp_replace(new_with_check, 
                '\(SELECT\s+users\.ca_code\s+FROM\s+users\s+WHERE\s+users\.id\s*=\s*auth\.uid\(\)\)', 
                '(SELECT ca_code FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1)',
                'gi');
            
            new_with_check := regexp_replace(new_with_check, 
                '\(SELECT\s+users\.cs_code\s+FROM\s+users\s+WHERE\s+users\.id\s*=\s*auth\.uid\(\)\)', 
                '(SELECT cs_code FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1)',
                'gi');
            
            new_with_check := regexp_replace(new_with_check, 
                'IN\s*\(\s*SELECT\s+users\.ca_code\s+FROM\s+users\s+WHERE\s+users\.id\s*=\s*auth\.uid\(\)\s*\)', 
                'IN (SELECT ca_code FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1)',
                'gi');
            
            new_with_check := regexp_replace(new_with_check, 
                'IN\s*\(\s*SELECT\s+users\.cs_code\s+FROM\s+users\s+WHERE\s+users\.id\s*=\s*auth\.uid\(\)\s*\)', 
                'IN (SELECT cs_code FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1)',
                'gi');
            
            new_with_check := regexp_replace(new_with_check, 
                '\bFROM\s+users\b', 
                'FROM public.user_profiles',
                'gi');
            
            new_with_check := regexp_replace(new_with_check, 
                '\busers\.id\b', 
                'auth_user_id',
                'gi');
            
            new_with_check := regexp_replace(new_with_check, 
                '\busers\.role\b', 
                'role',
                'gi');
            
            new_with_check := regexp_replace(new_with_check, 
                '\busers\.ca_code\b', 
                'ca_code',
                'gi');
            
            new_with_check := regexp_replace(new_with_check, 
                '\busers\.cs_code\b', 
                'cs_code',
                'gi');
        END IF;
        
        -- Only update if expressions actually changed
        IF (new_qual IS DISTINCT FROM policy_record.qual) OR (new_with_check IS DISTINCT FROM policy_record.with_check) THEN
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
        ELSE
            RAISE NOTICE '⚠️  No changes detected for policy: %.%', policy_record.tablename, policy_record.policyname;
        END IF;
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
       AND ((pp.qual IS NOT NULL AND (pp.qual ILIKE '%users%' OR pp.qual ILIKE '%public.users%'))
            OR (pp.with_check IS NOT NULL AND (pp.with_check ILIKE '%users%' OR pp.with_check ILIKE '%public.users%')))) as remaining_policies,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies pp
              WHERE schemaname = 'public'
                AND ((pp.qual IS NOT NULL AND (pp.qual ILIKE '%public.users%'))
                     OR (pp.with_check IS NOT NULL AND (pp.with_check ILIKE '%public.users%')))) = 0 
        THEN '✅ ALL RLS POLICIES MIGRATED TO user_profiles'
        ELSE '❌ SOME RLS POLICIES STILL REFERENCE users TABLE'
    END as final_status;











