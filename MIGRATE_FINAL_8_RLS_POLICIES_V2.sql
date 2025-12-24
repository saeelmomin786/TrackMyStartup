-- =====================================================
-- MIGRATE FINAL 8 RLS POLICIES TO USER_PROFILES (V2)
-- =====================================================
-- This script handles the remaining 8 policies with specific pattern matching

DO $$
DECLARE
    policy_record RECORD;
    updated_qual TEXT;
    updated_with_check TEXT;
    policies_updated INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting migration of final 8 RLS policies...';
    RAISE NOTICE '';

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
          AND pg_get_expr(p.polqual, p.polrelid) NOT ILIKE '%FROM auth.users%'
        ORDER BY c.relname, p.polname
    LOOP
        RAISE NOTICE 'Processing: %.%', policy_record.table_name, policy_record.policy_name;
        
        updated_qual := policy_record.qual_expr;
        updated_with_check := policy_record.with_check_expr;
        
        -- Handle qual expression
        IF updated_qual IS NOT NULL THEN
            -- Remove entire OR fallback clauses that query users table
            -- Pattern: "OR (investor_code IN (SELECT users.investor_code FROM users WHERE..."
            updated_qual := regexp_replace(
                updated_qual,
                '\s+OR\s+\(investor_code\s+IN\s*\(\s*SELECT\s+users\.investor_code\s+FROM\s+users\s+WHERE[^)]+\)\)',
                '',
                'g'
            );
            
            -- Remove OR EXISTS clauses with FROM users
            updated_qual := regexp_replace(
                updated_qual,
                '\s+OR\s+\(EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+users[^)]+\)\)',
                '',
                'g'
            );
            
            -- Replace "FROM users WHERE" patterns
            updated_qual := regexp_replace(
                updated_qual,
                'FROM\s+users\s+WHERE\s+\(\(\([^)]+\)\s*AND\s*\(',
                'FROM user_profiles u WHERE u.auth_user_id = auth.uid() AND (',
                'g'
            );
            
            -- Replace "EXISTS (SELECT 1 FROM users WHERE"
            updated_qual := regexp_replace(
                updated_qual,
                '\(EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+users\s+WHERE',
                '(EXISTS (SELECT 1 FROM user_profiles u WHERE u.auth_user_id = auth.uid() AND',
                'g'
            );
            
            -- Replace "FROM users u WHERE u.id = auth.uid()"
            updated_qual := regexp_replace(
                updated_qual,
                'FROM\s+users\s+u\s+WHERE\s+u\.id\s*=\s*auth\.uid\(\)',
                'FROM user_profiles u WHERE u.auth_user_id = auth.uid()',
                'g'
            );
            
            -- Replace column references
            updated_qual := regexp_replace(updated_qual, 'users\.role', 'user_profiles.role', 'g');
            updated_qual := regexp_replace(updated_qual, 'users\.investor_code', 'user_profiles.investor_code', 'g');
            updated_qual := regexp_replace(updated_qual, 'users\.mentor_code', 'user_profiles.mentor_code', 'g');
        END IF;
        
        -- Handle with_check expression
        IF updated_with_check IS NOT NULL THEN
            -- Remove OR fallback clauses
            updated_with_check := regexp_replace(
                updated_with_check,
                '\s+OR\s+\(investor_code\s+IN\s*\(\s*SELECT\s+users\.investor_code\s+FROM\s+users\s+WHERE[^)]+\)\)',
                '',
                'g'
            );
            
            -- Replace column references
            updated_with_check := regexp_replace(updated_with_check, 'users\.investor_code', 'user_profiles.investor_code', 'g');
            updated_with_check := regexp_replace(updated_with_check, 'users\.role', 'user_profiles.role', 'g');
            
            -- Replace FROM users
            updated_with_check := regexp_replace(
                updated_with_check,
                'FROM\s+users\s+WHERE',
                'FROM user_profiles u WHERE u.auth_user_id = auth.uid() AND',
                'g'
            );
        END IF;
        
        -- Update policy if changed
        IF updated_qual IS DISTINCT FROM policy_record.qual_expr OR 
           updated_with_check IS DISTINCT FROM policy_record.with_check_expr THEN
            
            BEGIN
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 
                    policy_record.policy_name, policy_record.table_name);
                
                IF updated_qual IS NOT NULL AND updated_with_check IS NOT NULL THEN
                    EXECUTE format('CREATE POLICY %I ON public.%I FOR %s USING (%s) WITH CHECK (%s)',
                        policy_record.policy_name, policy_record.table_name, policy_record.command_type,
                        updated_qual, updated_with_check);
                ELSIF updated_qual IS NOT NULL THEN
                    EXECUTE format('CREATE POLICY %I ON public.%I FOR %s USING (%s)',
                        policy_record.policy_name, policy_record.table_name, policy_record.command_type, updated_qual);
                ELSIF updated_with_check IS NOT NULL THEN
                    EXECUTE format('CREATE POLICY %I ON public.%I FOR %s WITH CHECK (%s)',
                        policy_record.policy_name, policy_record.table_name, policy_record.command_type, updated_with_check);
                END IF;
                
                policies_updated := policies_updated + 1;
                RAISE NOTICE '  ✅ Updated';
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE '  ❌ Error: %', SQLERRM;
            END;
        ELSE
            RAISE NOTICE '  ⚠️  No changes';
        END IF;
        
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '=== SUMMARY ===';
    RAISE NOTICE 'Policies updated: %', policies_updated;
END $$;

-- Handle policies with FROM auth.users (replace with user_profiles for admin check)
DO $$
DECLARE
    policy_record RECORD;
    updated_qual TEXT;
    policies_updated INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Handling policies with FROM auth.users...';
    
    FOR policy_record IN 
        SELECT 
            c.relname::text as table_name,
            p.polname::text as policy_name,
            CASE p.polcmd WHEN '*' THEN 'ALL' ELSE 'SELECT' END as command_type,
            pg_get_expr(p.polqual, p.polrelid) as qual_expr
        FROM pg_policy p
        JOIN pg_class c ON p.polrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.polqual IS NOT NULL
          AND pg_get_expr(p.polqual, p.polrelid) ILIKE '%FROM auth.users%'
    LOOP
        RAISE NOTICE 'Processing: %.%', policy_record.table_name, policy_record.policy_name;
        
        updated_qual := policy_record.qual_expr;
        
        -- Replace FROM auth.users with FROM user_profiles
        updated_qual := regexp_replace(updated_qual, 'FROM\s+auth\.users', 'FROM user_profiles', 'g');
        
        -- Replace users.raw_user_meta_data check with user_profiles.role check
        updated_qual := regexp_replace(
            updated_qual,
            '\(users\.raw_user_meta_data\s*->>\s*''role''::text\)\s*=\s*''admin''::text',
            'user_profiles.role = ''Admin''::user_role',
            'g'
        );
        
        -- Add auth check if not present
        IF updated_qual NOT LIKE '%user_profiles.auth_user_id = auth.uid()%' THEN
            updated_qual := regexp_replace(
                updated_qual,
                'FROM\s+user_profiles(?!\s+WHERE)',
                'FROM user_profiles WHERE user_profiles.auth_user_id = auth.uid() AND',
                'g'
            );
        END IF;
        
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 
                policy_record.policy_name, policy_record.table_name);
            
            EXECUTE format('CREATE POLICY %I ON public.%I FOR %s USING (%s)',
                policy_record.policy_name, policy_record.table_name, policy_record.command_type, updated_qual);
            
            policies_updated := policies_updated + 1;
            RAISE NOTICE '  ✅ Updated';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '  ❌ Error: %', SQLERRM;
        END;
        
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE 'Auth.users policies updated: %', policies_updated;
END $$;

-- Final verification
SELECT 
    '=== FINAL VERIFICATION ===' as status,
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
       AND pg_get_expr(p.polqual, p.polrelid) NOT ILIKE '%user_profiles%'
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
                AND pg_get_expr(p.polqual, p.polrelid) NOT ILIKE '%user_profiles%'
        ) = 0 
        THEN '✅ ALL RLS POLICIES MIGRATED TO user_profiles'
        ELSE '❌ SOME RLS POLICIES STILL REFERENCE users TABLE'
    END as final_status;















