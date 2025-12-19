-- =====================================================
-- MIGRATE FINAL 8 RLS POLICIES TO USER_PROFILES
-- =====================================================
-- This script handles the remaining 8 policies with complex patterns:
-- 1. Nested FROM users in EXISTS clauses
-- 2. FROM users with column references (users.investor_code, users.role, users.mentor_code)
-- 3. FROM auth.users (Supabase auth table) - these should remain as-is if checking raw_user_meta_data
-- 4. Mixed patterns with fallback to users table

DO $$
DECLARE
    policy_record RECORD;
    updated_qual TEXT;
    updated_with_check TEXT;
    policies_updated INTEGER := 0;
    policies_checked INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting migration of final 8 RLS policies...';
    RAISE NOTICE '';

    -- Loop through all policies that still reference users table
    FOR policy_record IN 
        SELECT 
            c.relname::text as table_name,
            p.polname::text as policy_name,
            CASE p.polcmd
                WHEN 'r' THEN 'SELECT'
                WHEN 'a' THEN 'INSERT'
                WHEN 'w' THEN 'UPDATE'
                WHEN 'd' THEN 'DELETE'
                WHEN '*' THEN 'ALL'
                ELSE 'UNKNOWN'
            END as command_type,
            pg_get_expr(p.polqual, p.polrelid) as qual_expr,
            pg_get_expr(p.polwithcheck, p.polrelid) as with_check_expr
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
        ORDER BY c.relname, p.polname
    LOOP
        policies_checked := policies_checked + 1;
        
        RAISE NOTICE 'Processing: %.% (% on %)', 
            policy_record.table_name, 
            policy_record.policy_name,
            policy_record.command_type,
            policy_record.table_name;
        
        updated_qual := policy_record.qual_expr;
        updated_with_check := policy_record.with_check_expr;
        
        -- Handle qual expression
        IF policy_record.qual_expr IS NOT NULL THEN
            -- Pattern 1: Remove fallback OR clauses with "OR (investor_code IN (SELECT users.investor_code FROM users..."
            -- This is a complete OR clause that we want to remove
            updated_qual := regexp_replace(
                updated_qual,
                '\s+OR\s+\(investor_code\s+IN\s*\(\s*SELECT\s+users\.investor_code\s+FROM\s+users[^)]+\)\)',
                '',
                'gi'
            );
            
            -- Pattern 2: Remove fallback OR clauses with "OR (EXISTS (SELECT 1 FROM users..."
            -- Handle nested EXISTS with FROM users - remove the entire OR clause
            updated_qual := regexp_replace(
                updated_qual,
                '\s+OR\s+\(EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+users[^)]+WHERE[^)]+\)\)',
                '',
                'gi'
            );
            
            -- Pattern 3: Handle "FROM users WHERE" - replace with user_profiles
            updated_qual := regexp_replace(
                updated_qual,
                'FROM\s+users\s+WHERE\s+\(\(\([^)]+\)\s*AND\s*\(',
                'FROM user_profiles u WHERE u.auth_user_id = auth.uid() AND (',
                'gi'
            );
            
            -- Pattern 4: Handle "FROM users" at end of EXISTS - add WHERE clause
            updated_qual := regexp_replace(
                updated_qual,
                '\(EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+users\s+WHERE',
                '(EXISTS (SELECT 1 FROM user_profiles u WHERE u.auth_user_id = auth.uid() AND',
                'gi'
            );
            
            -- Pattern 5: Handle "FROM users u WHERE u.id = auth.uid()" - change to user_profiles
            updated_qual := regexp_replace(
                updated_qual,
                'FROM\s+users\s+u\s+WHERE\s+u\.id\s*=\s*auth\.uid\(\)',
                'FROM user_profiles u WHERE u.auth_user_id = auth.uid()',
                'gi'
            );
            
            -- Pattern 6: Replace "FROM auth.users" with "FROM user_profiles" for admin checks
            -- (These policies are checking admin role, should use user_profiles instead of auth.users)
            updated_qual := regexp_replace(
                updated_qual,
                'FROM\s+auth\.users',
                'FROM user_profiles',
                'gi'
            );
            
            -- Pattern 7: Replace column references BEFORE doing global replace
            updated_qual := regexp_replace(
                updated_qual,
                'users\.role',
                'user_profiles.role',
                'gi'
            );
            
            updated_qual := regexp_replace(
                updated_qual,
                'users\.investor_code',
                'user_profiles.investor_code',
                'gi'
            );
            
            updated_qual := regexp_replace(
                updated_qual,
                'users\.mentor_code',
                'user_profiles.mentor_code',
                'gi'
            );
            
            -- Pattern 8: Replace "users.raw_user_meta_data" with user_profiles role check
            -- This is checking for admin role, so replace with user_profiles.role = 'Admin'
            updated_qual := regexp_replace(
                updated_qual,
                '\(users\.raw_user_meta_data\s*->>\s*''role''::text\)\s*=\s*''admin''::text',
                'user_profiles.role = ''Admin''::user_role',
                'gi'
            );
            
            -- Pattern 9: Replace remaining standalone "users" table references
            -- But exclude "user_profiles", "auth.users", and "users." (already handled)
            updated_qual := regexp_replace(
                updated_qual,
                '\bFROM\s+users\b(?!\.)',
                'FROM user_profiles u',
                'gi'
            );
            
            -- Pattern 10: Add WHERE clause if we have "FROM user_profiles u" without proper WHERE
            -- This is a cleanup step to ensure auth check is present
            IF updated_qual LIKE '%FROM user_profiles u%' AND updated_qual NOT LIKE '%u.auth_user_id = auth.uid()%' THEN
                updated_qual := regexp_replace(
                    updated_qual,
                    'FROM\s+user_profiles\s+u(?!\s+WHERE)',
                    'FROM user_profiles u WHERE u.auth_user_id = auth.uid() AND',
                    'gi'
                );
            END IF;
        END IF;
        
        -- Handle with_check expression
        IF policy_record.with_check_expr IS NOT NULL THEN
            -- Apply same patterns to with_check expression
            -- Pattern 1: Remove fallback OR clauses
            updated_with_check := regexp_replace(
                updated_with_check,
                '\s+OR\s+\(investor_code\s+IN\s*\(\s*SELECT\s+users\.investor_code\s+FROM\s+users[^)]+\)\)',
                '',
                'gi'
            );
            
            -- Pattern 2: Replace column references
            updated_with_check := regexp_replace(
                updated_with_check,
                'users\.role',
                'user_profiles.role',
                'gi'
            );
            
            updated_with_check := regexp_replace(
                updated_with_check,
                'users\.investor_code',
                'user_profiles.investor_code',
                'gi'
            );
            
            updated_with_check := regexp_replace(
                updated_with_check,
                'users\.mentor_code',
                'user_profiles.mentor_code',
                'gi'
            );
            
            -- Pattern 3: Replace FROM users
            updated_with_check := regexp_replace(
                updated_with_check,
                'FROM\s+users\s+WHERE',
                'FROM user_profiles u WHERE u.auth_user_id = auth.uid() AND',
                'gi'
            );
        END IF;
        
        -- Update the policy if there were changes
        IF updated_qual <> policy_record.qual_expr OR 
           (updated_with_check IS DISTINCT FROM policy_record.with_check_expr) THEN
            
            BEGIN
                -- Drop and recreate the policy
                EXECUTE format(
                    'DROP POLICY IF EXISTS %I ON public.%I',
                    policy_record.policy_name,
                    policy_record.table_name
                );
                
                -- Recreate with updated expression
                IF updated_qual IS NOT NULL AND updated_with_check IS NOT NULL THEN
                    EXECUTE format(
                        'CREATE POLICY %I ON public.%I FOR %s USING (%s) WITH CHECK (%s)',
                        policy_record.policy_name,
                        policy_record.table_name,
                        policy_record.command_type,
                        updated_qual,
                        updated_with_check
                    );
                ELSIF updated_qual IS NOT NULL THEN
                    EXECUTE format(
                        'CREATE POLICY %I ON public.%I FOR %s USING (%s)',
                        policy_record.policy_name,
                        policy_record.table_name,
                        policy_record.command_type,
                        updated_qual
                    );
                ELSIF updated_with_check IS NOT NULL THEN
                    EXECUTE format(
                        'CREATE POLICY %I ON public.%I FOR %s WITH CHECK (%s)',
                        policy_record.policy_name,
                        policy_record.table_name,
                        policy_record.command_type,
                        updated_with_check
                    );
                END IF;
                
                policies_updated := policies_updated + 1;
                RAISE NOTICE '  ✅ Updated policy: %', policy_record.policy_name;
                
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE '  ❌ Error updating policy %: %', policy_record.policy_name, SQLERRM;
                    RAISE NOTICE '  Original qual: %', substring(policy_record.qual_expr, 1, 200);
                    RAISE NOTICE '  Updated qual: %', substring(updated_qual, 1, 200);
            END;
        ELSE
            RAISE NOTICE '  ⚠️  No changes detected for policy: %', policy_record.policy_name;
        END IF;
        
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== MIGRATION SUMMARY ===';
    RAISE NOTICE 'Policies checked: %', policies_checked;
    RAISE NOTICE 'Policies updated: %', policies_updated;
    RAISE NOTICE '✅ Migration attempt complete!';
END $$;

-- Verify migration
SELECT 
    '=== VERIFICATION ===' as status,
    (SELECT COUNT(*) 
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
    ) as remaining_policies,
    CASE 
        WHEN (SELECT COUNT(*) 
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
        ) = 0 
        THEN '✅ ALL RLS POLICIES MIGRATED TO user_profiles'
        ELSE '❌ SOME RLS POLICIES STILL REFERENCE users TABLE'
    END as final_status;

