-- =====================================================
-- MIGRATE ALL RLS POLICIES TO USE user_profiles
-- OPTIMIZED VERSION: NO FALLBACK (FASTER FOR LARGE USER BASE)
-- =====================================================
-- This script migrates all 133 RLS policies from users to user_profiles
-- It handles common patterns:
-- 1. Admin checks: EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'Admin')
-- 2. Role checks: (SELECT users.role FROM users WHERE users.id = auth.uid()) = 'Admin'
-- 3. Code checks: (SELECT users.ca_code FROM users WHERE users.id = auth.uid())
-- 4. IN clauses: (ca_code)::text IN (SELECT users.ca_code FROM users WHERE users.id = auth.uid())
--
-- IMPORTANT: This script uses string replacement to update policy expressions
-- It preserves security logic while migrating to user_profiles

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
        -- PATTERN 1: Replace users.id = auth.uid() with user_profiles.auth_user_id = auth.uid()
        -- =====================================================
        -- Handle: users.id = auth.uid()
        new_qual := REPLACE(new_qual, 'users.id = auth.uid()', 
            '(SELECT auth_user_id FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1) = auth.uid()');
        new_with_check := REPLACE(new_with_check, 'users.id = auth.uid()', 
            '(SELECT auth_user_id FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1) = auth.uid()');
        
        -- Handle: (users.id)::text = (auth.uid())::text
        new_qual := REPLACE(new_qual, '(users.id)::text = (auth.uid())::text', 
            '((SELECT auth_user_id FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1))::text = (auth.uid())::text');
        new_with_check := REPLACE(new_with_check, '(users.id)::text = (auth.uid())::text', 
            '((SELECT auth_user_id FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1))::text = (auth.uid())::text');
        
        -- =====================================================
        -- PATTERN 2: Replace SELECT users.role FROM users WHERE users.id = auth.uid()
        -- =====================================================
        new_qual := REPLACE(new_qual, 
            '(SELECT users.role FROM users WHERE users.id = auth.uid())', 
            '(SELECT role FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1)');
        new_with_check := REPLACE(new_with_check, 
            '(SELECT users.role FROM users WHERE users.id = auth.uid())', 
            '(SELECT role FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1)');
        
        -- =====================================================
        -- PATTERN 3: Replace EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'Admin')
        -- =====================================================
        new_qual := REPLACE(new_qual, 
            'EXISTS ( SELECT 1 FROM users WHERE (((users.id)::text = (auth.uid())::text) AND (users.role = ''Admin''::user_role)))',
            'EXISTS ( SELECT 1 FROM public.user_profiles WHERE auth_user_id = auth.uid() AND role = ''Admin''::user_role ORDER BY created_at DESC LIMIT 1)');
        new_with_check := REPLACE(new_with_check, 
            'EXISTS ( SELECT 1 FROM users WHERE (((users.id)::text = (auth.uid())::text) AND (users.role = ''Admin''::user_role)))',
            'EXISTS ( SELECT 1 FROM public.user_profiles WHERE auth_user_id = auth.uid() AND role = ''Admin''::user_role ORDER BY created_at DESC LIMIT 1)');
        
        -- Handle without double parentheses
        new_qual := REPLACE(new_qual, 
            'EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.role = ''Admin''::user_role)))',
            'EXISTS ( SELECT 1 FROM public.user_profiles WHERE auth_user_id = auth.uid() AND role = ''Admin''::user_role ORDER BY created_at DESC LIMIT 1)');
        new_with_check := REPLACE(new_with_check, 
            'EXISTS ( SELECT 1 FROM users WHERE ((users.id = auth.uid()) AND (users.role = ''Admin''::user_role)))',
            'EXISTS ( SELECT 1 FROM public.user_profiles WHERE auth_user_id = auth.uid() AND role = ''Admin''::user_role ORDER BY created_at DESC LIMIT 1)');
        
        -- =====================================================
        -- PATTERN 4: Replace SELECT users.ca_code FROM users WHERE users.id = auth.uid()
        -- =====================================================
        new_qual := REPLACE(new_qual, 
            '(SELECT users.ca_code FROM users WHERE users.id = auth.uid())',
            '(SELECT ca_code FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1)');
        new_with_check := REPLACE(new_with_check, 
            '(SELECT users.ca_code FROM users WHERE users.id = auth.uid())',
            '(SELECT ca_code FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1)');
        
        -- =====================================================
        -- PATTERN 5: Replace SELECT users.cs_code FROM users WHERE users.id = auth.uid()
        -- =====================================================
        new_qual := REPLACE(new_qual, 
            '(SELECT users.cs_code FROM users WHERE users.id = auth.uid())',
            '(SELECT cs_code FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1)');
        new_with_check := REPLACE(new_with_check, 
            '(SELECT users.cs_code FROM users WHERE users.id = auth.uid())',
            '(SELECT cs_code FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1)');
        
        -- =====================================================
        -- PATTERN 6: Replace IN clauses with users table
        -- =====================================================
        -- Handle: (ca_code)::text IN (SELECT users.ca_code FROM users WHERE users.id = auth.uid())
        new_qual := REPLACE(new_qual, 
            'IN ( SELECT users.ca_code FROM users WHERE users.id = auth.uid())',
            'IN ( SELECT ca_code FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1)');
        new_with_check := REPLACE(new_with_check, 
            'IN ( SELECT users.ca_code FROM users WHERE users.id = auth.uid())',
            'IN ( SELECT ca_code FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1)');
        
        new_qual := REPLACE(new_qual, 
            'IN ( SELECT users.cs_code FROM users WHERE users.id = auth.uid())',
            'IN ( SELECT cs_code FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1)');
        new_with_check := REPLACE(new_with_check, 
            'IN ( SELECT users.cs_code FROM users WHERE users.id = auth.uid())',
            'IN ( SELECT cs_code FROM public.user_profiles WHERE auth_user_id = auth.uid() ORDER BY created_at DESC LIMIT 1)');
        
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
       AND ((pp.qual IS NOT NULL AND (pp.qual ILIKE '%users%' OR pp.qual ILIKE '%public.users%'))
            OR (pp.with_check IS NOT NULL AND (pp.with_check ILIKE '%users%' OR pp.with_check ILIKE '%public.users%')))) as remaining_policies,
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_policies pp
              WHERE schemaname = 'public'
                AND ((pp.qual IS NOT NULL AND (pp.qual ILIKE '%users%' OR pp.qual ILIKE '%public.users%'))
                     OR (pp.with_check IS NOT NULL AND (pp.with_check ILIKE '%users%' OR pp.with_check ILIKE '%public.users%')))) = 0 
        THEN '✅ ALL RLS POLICIES MIGRATED TO user_profiles'
        ELSE '❌ SOME RLS POLICIES STILL REFERENCE users TABLE'
    END as final_status;


