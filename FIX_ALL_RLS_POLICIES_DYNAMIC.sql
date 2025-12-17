-- =====================================================
-- DYNAMIC RLS POLICY FIX FOR ALL TABLES
-- =====================================================
-- This script automatically fixes RLS policies for ALL tables
-- based on their actual structure and foreign key constraints
-- Handles 113+ tables with RLS enabled
--
-- ⚠️ SAFETY NOTES:
-- 1. This script DROPS and RECREATES policies
-- 2. Run BACKUP_RLS_POLICIES.sql FIRST to create a backup
-- 3. The new policies are MORE PERMISSIVE (support both auth.uid() and profile IDs)
-- 4. Existing flows should continue to work
-- 5. If issues occur, run RESTORE_RLS_POLICIES.sql to revert
-- =====================================================

-- =====================================================
-- STEP 1: Create helper function to get auth user ID from profile
-- =====================================================
CREATE OR REPLACE FUNCTION get_auth_user_id_from_profile(profile_id UUID)
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT auth_user_id 
        FROM public.user_profiles 
        WHERE id = profile_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 2: Fix RLS policies for tables with user_id columns
-- =====================================================
DO $$
DECLARE
    table_rec RECORD;
    col_rec RECORD;
    has_fk_to_users BOOLEAN;
    fk_table_name TEXT;
    fk_column_name TEXT;
    policy_name TEXT;
    column_name TEXT;
    is_text_type BOOLEAN;
BEGIN
    -- Loop through all tables with user_id-like columns
    FOR table_rec IN 
        SELECT DISTINCT c.table_name
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
        AND (
            c.column_name LIKE '%user_id%'
            OR c.column_name LIKE '%investor_id%'
            OR c.column_name LIKE '%advisor_id%'
            OR c.column_name LIKE '%mentor_id%'
            OR c.column_name LIKE '%requester_id%'
        )
        AND c.table_name IN (
            SELECT tablename FROM pg_tables WHERE schemaname = 'public'
        )
    LOOP
        -- Check if table has RLS enabled
        IF EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE c.relname = table_rec.table_name
            AND n.nspname = 'public'
            AND c.relrowsecurity = true
        ) THEN
            -- Find the user reference column
            FOR col_rec IN
                SELECT c.column_name, c.data_type
                FROM information_schema.columns c
                WHERE c.table_schema = 'public'
                AND c.table_name = table_rec.table_name
                AND (
                    c.column_name LIKE '%user_id%'
                    OR c.column_name LIKE '%investor_id%'
                    OR c.column_name LIKE '%advisor_id%'
                    OR c.column_name LIKE '%mentor_id%'
                    OR c.column_name LIKE '%requester_id%'
                )
                ORDER BY 
                    CASE 
                        WHEN c.column_name = 'user_id' THEN 1
                        WHEN c.column_name LIKE '%_id' THEN 2
                        ELSE 3
                    END
                LIMIT 1
            LOOP
                column_name := col_rec.column_name;
                
                -- Check if column is text/varchar type (needs casting)
                -- Handle both 'character varying' and 'character varying(255)' etc.
                is_text_type := col_rec.data_type LIKE 'character varying%' 
                    OR col_rec.data_type LIKE 'varchar%'
                    OR col_rec.data_type IN ('text', 'char', 'character');
                
                -- Check if this column has FK to users(id)
                SELECT 
                    EXISTS (
                        SELECT 1 FROM information_schema.table_constraints tc
                        JOIN information_schema.key_column_usage kcu 
                            ON tc.constraint_name = kcu.constraint_name
                            AND tc.table_schema = kcu.table_schema
                        JOIN information_schema.constraint_column_usage ccu 
                            ON ccu.constraint_name = tc.constraint_name
                            AND ccu.table_schema = tc.table_schema
                        WHERE tc.table_name = table_rec.table_name
                        AND kcu.column_name = col_rec.column_name
                        AND ccu.table_name = 'users'
                        AND ccu.column_name = 'id'
                        AND tc.constraint_type = 'FOREIGN KEY'
                    ),
                    COALESCE(
                        (SELECT ccu.table_name FROM information_schema.table_constraints tc
                        JOIN information_schema.key_column_usage kcu 
                            ON tc.constraint_name = kcu.constraint_name
                        JOIN information_schema.constraint_column_usage ccu 
                            ON ccu.constraint_name = tc.constraint_name
                        WHERE tc.table_name = table_rec.table_name
                        AND kcu.column_name = col_rec.column_name
                        AND tc.constraint_type = 'FOREIGN KEY'
                        LIMIT 1),
                        ''
                    ),
                    COALESCE(
                        (SELECT ccu.column_name FROM information_schema.table_constraints tc
                        JOIN information_schema.key_column_usage kcu 
                            ON tc.constraint_name = kcu.constraint_name
                        JOIN information_schema.constraint_column_usage ccu 
                            ON ccu.constraint_name = tc.constraint_name
                        WHERE tc.table_name = table_rec.table_name
                        AND kcu.column_name = col_rec.column_name
                        AND tc.constraint_type = 'FOREIGN KEY'
                        LIMIT 1),
                        ''
                    )
                INTO has_fk_to_users, fk_table_name, fk_column_name;
                
                -- Drop existing policies
                EXECUTE format('
                    DROP POLICY IF EXISTS "Users can insert %I" ON public.%I;
                    DROP POLICY IF EXISTS "Users can view %I" ON public.%I;
                    DROP POLICY IF EXISTS "Users can update %I" ON public.%I;
                    DROP POLICY IF EXISTS "Users can delete %I" ON public.%I;
                ', table_rec.table_name, table_rec.table_name,
                   table_rec.table_name, table_rec.table_name,
                   table_rec.table_name, table_rec.table_name,
                   table_rec.table_name, table_rec.table_name);
                
                -- Create policies based on FK constraint
                    IF has_fk_to_users THEN
                        -- FK to users(id) - MUST use auth.uid()
                        IF is_text_type THEN
                            EXECUTE format('
                                CREATE POLICY "Users can insert %I" 
                                ON public.%I FOR INSERT TO authenticated
                                WITH CHECK (%I = auth.uid()::text);
                            ', table_rec.table_name, table_rec.table_name, col_rec.column_name);
                            
                            EXECUTE format('
                                CREATE POLICY "Users can view %I" 
                                ON public.%I FOR SELECT TO authenticated
                                USING (%I = auth.uid()::text);
                            ', table_rec.table_name, table_rec.table_name, col_rec.column_name);
                            
                            EXECUTE format('
                                CREATE POLICY "Users can update %I" 
                                ON public.%I FOR UPDATE TO authenticated
                                USING (%I = auth.uid()::text)
                                WITH CHECK (%I = auth.uid()::text);
                            ', table_rec.table_name, table_rec.table_name, col_rec.column_name, col_rec.column_name);
                            
                            EXECUTE format('
                                CREATE POLICY "Users can delete %I" 
                                ON public.%I FOR DELETE TO authenticated
                                USING (%I = auth.uid()::text);
                            ', table_rec.table_name, table_rec.table_name, col_rec.column_name);
                        ELSE
                            EXECUTE format('
                                CREATE POLICY "Users can insert %I" 
                                ON public.%I FOR INSERT TO authenticated
                                WITH CHECK (%I = auth.uid());
                            ', table_rec.table_name, table_rec.table_name, col_rec.column_name);
                            
                            EXECUTE format('
                                CREATE POLICY "Users can view %I" 
                                ON public.%I FOR SELECT TO authenticated
                                USING (%I = auth.uid());
                            ', table_rec.table_name, table_rec.table_name, col_rec.column_name);
                            
                            EXECUTE format('
                                CREATE POLICY "Users can update %I" 
                                ON public.%I FOR UPDATE TO authenticated
                                USING (%I = auth.uid())
                                WITH CHECK (%I = auth.uid());
                            ', table_rec.table_name, table_rec.table_name, col_rec.column_name, col_rec.column_name);
                            
                            EXECUTE format('
                                CREATE POLICY "Users can delete %I" 
                                ON public.%I FOR DELETE TO authenticated
                                USING (%I = auth.uid());
                            ', table_rec.table_name, table_rec.table_name, col_rec.column_name);
                        END IF;
                        
                        RAISE NOTICE '✅ Fixed % (FK to users.id, using auth.uid())', table_rec.table_name;
                    ELSE
                        -- No FK constraint or FK to user_profiles - support both auth.uid() and profile IDs
                        IF is_text_type THEN
                            EXECUTE format('
                                CREATE POLICY "Users can insert %I" 
                                ON public.%I FOR INSERT TO authenticated
                                WITH CHECK (
                                    %I = auth.uid()::text
                                    OR EXISTS (
                                        SELECT 1 FROM public.user_profiles 
                                        WHERE auth_user_id = auth.uid() 
                                        AND %I = id::text
                                    )
                                );
                            ', table_rec.table_name, table_rec.table_name, col_rec.column_name, col_rec.column_name);
                            
                            EXECUTE format('
                                CREATE POLICY "Users can view %I" 
                                ON public.%I FOR SELECT TO authenticated
                                USING (
                                    %I = auth.uid()::text
                                    OR EXISTS (
                                        SELECT 1 FROM public.user_profiles 
                                        WHERE auth_user_id = auth.uid() 
                                        AND %I = id::text
                                    )
                                );
                            ', table_rec.table_name, table_rec.table_name, col_rec.column_name, col_rec.column_name);
                            
                            EXECUTE format('
                                CREATE POLICY "Users can update %I" 
                                ON public.%I FOR UPDATE TO authenticated
                                USING (
                                    %I = auth.uid()::text
                                    OR EXISTS (
                                        SELECT 1 FROM public.user_profiles 
                                        WHERE auth_user_id = auth.uid() 
                                        AND %I = id::text
                                    )
                                )
                                WITH CHECK (
                                    %I = auth.uid()::text
                                    OR EXISTS (
                                        SELECT 1 FROM public.user_profiles 
                                        WHERE auth_user_id = auth.uid() 
                                        AND %I = id::text
                                    )
                                );
                            ', table_rec.table_name, table_rec.table_name, col_rec.column_name, col_rec.column_name, col_rec.column_name, col_rec.column_name);
                            
                            EXECUTE format('
                                CREATE POLICY "Users can delete %I" 
                                ON public.%I FOR DELETE TO authenticated
                                USING (
                                    %I = auth.uid()::text
                                    OR EXISTS (
                                        SELECT 1 FROM public.user_profiles 
                                        WHERE auth_user_id = auth.uid() 
                                        AND %I = id::text
                                    )
                                );
                            ', table_rec.table_name, table_rec.table_name, col_rec.column_name, col_rec.column_name);
                        ELSE
                            EXECUTE format('
                                CREATE POLICY "Users can insert %I" 
                                ON public.%I FOR INSERT TO authenticated
                                WITH CHECK (
                                    %I = auth.uid()
                                    OR EXISTS (
                                        SELECT 1 FROM public.user_profiles 
                                        WHERE auth_user_id = auth.uid() 
                                        AND id = %I
                                    )
                                );
                            ', table_rec.table_name, table_rec.table_name, col_rec.column_name, col_rec.column_name);
                            
                            EXECUTE format('
                                CREATE POLICY "Users can view %I" 
                                ON public.%I FOR SELECT TO authenticated
                                USING (
                                    %I = auth.uid()
                                    OR EXISTS (
                                        SELECT 1 FROM public.user_profiles 
                                        WHERE auth_user_id = auth.uid() 
                                        AND id = %I
                                    )
                                );
                            ', table_rec.table_name, table_rec.table_name, col_rec.column_name, col_rec.column_name);
                            
                            EXECUTE format('
                                CREATE POLICY "Users can update %I" 
                                ON public.%I FOR UPDATE TO authenticated
                                USING (
                                    %I = auth.uid()
                                    OR EXISTS (
                                        SELECT 1 FROM public.user_profiles 
                                        WHERE auth_user_id = auth.uid() 
                                        AND id = %I
                                    )
                                )
                                WITH CHECK (
                                    %I = auth.uid()
                                    OR EXISTS (
                                        SELECT 1 FROM public.user_profiles 
                                        WHERE auth_user_id = auth.uid() 
                                        AND id = %I
                                    )
                                );
                            ', table_rec.table_name, table_rec.table_name, col_rec.column_name, col_rec.column_name, col_rec.column_name, col_rec.column_name);
                            
                            EXECUTE format('
                                CREATE POLICY "Users can delete %I" 
                                ON public.%I FOR DELETE TO authenticated
                                USING (
                                    %I = auth.uid()
                                    OR EXISTS (
                                        SELECT 1 FROM public.user_profiles 
                                        WHERE auth_user_id = auth.uid() 
                                        AND id = %I
                                    )
                                );
                            ', table_rec.table_name, table_rec.table_name, col_rec.column_name, col_rec.column_name);
                        END IF;
                        
                        RAISE NOTICE '✅ Fixed % (no FK to users.id, supporting both auth.uid() and profile IDs)', table_rec.table_name;
                    END IF;
                
                -- Only process first matching column per table
                EXIT;
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- STEP 3: Fix special cases (tables with code columns, etc.)
-- =====================================================

-- Fix startup_addition_requests (uses investor_code, not user_id)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'startup_addition_requests') THEN
        DROP POLICY IF EXISTS "Investors can insert startup addition requests" ON public.startup_addition_requests;
        DROP POLICY IF EXISTS "Investors can view startup addition requests" ON public.startup_addition_requests;
        DROP POLICY IF EXISTS "Investors can update startup addition requests" ON public.startup_addition_requests;
        
        CREATE POLICY "Investors can insert startup addition requests" 
        ON public.startup_addition_requests FOR INSERT TO authenticated
        WITH CHECK (
            investor_code IN (
                SELECT investor_code FROM public.user_profiles
                WHERE auth_user_id = auth.uid() AND role = 'Investor'
            )
            OR investor_code IN (
                SELECT investor_code FROM public.users
                WHERE id = auth.uid() AND role = 'Investor'
            )
        );
        
        CREATE POLICY "Investors can view startup addition requests" 
        ON public.startup_addition_requests FOR SELECT TO authenticated
        USING (
            investor_code IN (
                SELECT investor_code FROM public.user_profiles
                WHERE auth_user_id = auth.uid() AND role = 'Investor'
            )
            OR investor_code IN (
                SELECT investor_code FROM public.users
                WHERE id = auth.uid() AND role = 'Investor'
            )
            OR EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE auth_user_id = auth.uid() AND role = 'Admin'
            )
        );
        
        CREATE POLICY "Investors can update startup addition requests" 
        ON public.startup_addition_requests FOR UPDATE TO authenticated
        USING (
            investor_code IN (
                SELECT investor_code FROM public.user_profiles
                WHERE auth_user_id = auth.uid() AND role = 'Investor'
            )
            OR investor_code IN (
                SELECT investor_code FROM public.users
                WHERE id = auth.uid() AND role = 'Investor'
            )
        )
        WITH CHECK (
            investor_code IN (
                SELECT investor_code FROM public.user_profiles
                WHERE auth_user_id = auth.uid() AND role = 'Investor'
            )
            OR investor_code IN (
                SELECT investor_code FROM public.users
                WHERE id = auth.uid() AND role = 'Investor'
            )
        );
        
        RAISE NOTICE '✅ Fixed startup_addition_requests (uses investor_code)';
    END IF;
END $$;

-- Fix advisor_added_startups (advisor_id is VARCHAR)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'advisor_added_startups') THEN
        DROP POLICY IF EXISTS "Advisors can insert their added startups" ON public.advisor_added_startups;
        DROP POLICY IF EXISTS "Advisors can view their added startups" ON public.advisor_added_startups;
        DROP POLICY IF EXISTS "Advisors can update their added startups" ON public.advisor_added_startups;
        DROP POLICY IF EXISTS "Advisors can delete their added startups" ON public.advisor_added_startups;
        
        CREATE POLICY "Advisors can insert their added startups" 
        ON public.advisor_added_startups FOR INSERT TO authenticated
        WITH CHECK (
            advisor_id = auth.uid()::text
            OR EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE auth_user_id = auth.uid() 
                AND role = 'Investment Advisor'
                AND id::text = advisor_id
            )
        );
        
        CREATE POLICY "Advisors can view their added startups" 
        ON public.advisor_added_startups FOR SELECT TO authenticated
        USING (
            advisor_id = auth.uid()::text
            OR EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE auth_user_id = auth.uid() 
                AND role = 'Investment Advisor'
                AND id::text = advisor_id
            )
        );
        
        CREATE POLICY "Advisors can update their added startups" 
        ON public.advisor_added_startups FOR UPDATE TO authenticated
        USING (
            advisor_id = auth.uid()::text
            OR EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE auth_user_id = auth.uid() 
                AND role = 'Investment Advisor'
                AND id::text = advisor_id
            )
        )
        WITH CHECK (
            advisor_id = auth.uid()::text
            OR EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE auth_user_id = auth.uid() 
                AND role = 'Investment Advisor'
                AND id::text = advisor_id
            )
        );
        
        CREATE POLICY "Advisors can delete their added startups" 
        ON public.advisor_added_startups FOR DELETE TO authenticated
        USING (
            advisor_id = auth.uid()::text
            OR EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE auth_user_id = auth.uid() 
                AND role = 'Investment Advisor'
                AND id::text = advisor_id
            )
        );
        
        RAISE NOTICE '✅ Fixed advisor_added_startups (advisor_id is VARCHAR)';
    END IF;
END $$;

-- Fix investment_records (uses startup_id, not user_id directly)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investment_records') THEN
        DROP POLICY IF EXISTS "Users can insert investment records" ON public.investment_records;
        DROP POLICY IF EXISTS "Users can view investment records" ON public.investment_records;
        DROP POLICY IF EXISTS "Users can update investment records" ON public.investment_records;
        
        CREATE POLICY "Users can insert investment records" 
        ON public.investment_records FOR INSERT TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.startups s
                WHERE s.id = investment_records.startup_id
                AND s.user_id = auth.uid()
            )
        );
        
        CREATE POLICY "Users can view investment records" 
        ON public.investment_records FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.startups s
                WHERE s.id = investment_records.startup_id
                AND s.user_id = auth.uid()
            )
            OR investor_code IN (
                SELECT investor_code FROM public.user_profiles
                WHERE auth_user_id = auth.uid() AND role = 'Investor'
            )
            OR investor_code IN (
                SELECT investor_code FROM public.users
                WHERE id = auth.uid() AND role = 'Investor'
            )
        );
        
        CREATE POLICY "Users can update investment records" 
        ON public.investment_records FOR UPDATE TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.startups s
                WHERE s.id = investment_records.startup_id
                AND s.user_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.startups s
                WHERE s.id = investment_records.startup_id
                AND s.user_id = auth.uid()
            )
        );
        
        RAISE NOTICE '✅ Fixed investment_records (uses startup_id)';
    END IF;
END $$;

-- Fix mentor_equity_records (uses startup_id and mentor_code)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mentor_equity_records') THEN
        DROP POLICY IF EXISTS "Users can insert mentor equity records" ON public.mentor_equity_records;
        DROP POLICY IF EXISTS "Users can view mentor equity records" ON public.mentor_equity_records;
        DROP POLICY IF EXISTS "Users can update mentor equity records" ON public.mentor_equity_records;
        
        CREATE POLICY "Users can insert mentor equity records" 
        ON public.mentor_equity_records FOR INSERT TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.startups s
                WHERE s.id = mentor_equity_records.startup_id
                AND s.user_id = auth.uid()
            )
        );
        
        CREATE POLICY "Users can view mentor equity records" 
        ON public.mentor_equity_records FOR SELECT TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.startups s
                WHERE s.id = mentor_equity_records.startup_id
                AND s.user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE auth_user_id = auth.uid() 
                AND role = 'Mentor'
                AND mentor_code = mentor_equity_records.mentor_code
            )
        );
        
        CREATE POLICY "Users can update mentor equity records" 
        ON public.mentor_equity_records FOR UPDATE TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.startups s
                WHERE s.id = mentor_equity_records.startup_id
                AND s.user_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.startups s
                WHERE s.id = mentor_equity_records.startup_id
                AND s.user_id = auth.uid()
            )
        );
        
        RAISE NOTICE '✅ Fixed mentor_equity_records (uses startup_id and mentor_code)';
    END IF;
END $$;

-- Fix co_investment_opportunities (no direct user_id, role-based)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'co_investment_opportunities') THEN
        DROP POLICY IF EXISTS "Investment Advisors can insert co-investment opportunities" ON public.co_investment_opportunities;
        DROP POLICY IF EXISTS "Investment Advisors can view co-investment opportunities" ON public.co_investment_opportunities;
        DROP POLICY IF EXISTS "Investment Advisors can update co-investment opportunities" ON public.co_investment_opportunities;
        
        CREATE POLICY "Investment Advisors can insert co-investment opportunities" 
        ON public.co_investment_opportunities FOR INSERT TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE auth_user_id = auth.uid() 
                AND role = 'Investment Advisor'
            )
            OR EXISTS (
                SELECT 1 FROM public.users 
                WHERE id = auth.uid() 
                AND role = 'Investment Advisor'
            )
        );
        
        CREATE POLICY "Investment Advisors can view co-investment opportunities" 
        ON public.co_investment_opportunities FOR SELECT TO authenticated
        USING (true);
        
        CREATE POLICY "Investment Advisors can update co-investment opportunities" 
        ON public.co_investment_opportunities FOR UPDATE TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE auth_user_id = auth.uid() 
                AND role = 'Investment Advisor'
            )
            OR EXISTS (
                SELECT 1 FROM public.users 
                WHERE id = auth.uid() 
                AND role = 'Investment Advisor'
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE auth_user_id = auth.uid() 
                AND role = 'Investment Advisor'
            )
            OR EXISTS (
                SELECT 1 FROM public.users 
                WHERE id = auth.uid() 
                AND role = 'Investment Advisor'
            )
        );
        
        RAISE NOTICE '✅ Fixed co_investment_opportunities (role-based)';
    END IF;
END $$;

-- =====================================================
-- STEP 4: Summary
-- =====================================================
SELECT 
    '✅ DYNAMIC RLS FIX COMPLETE' as status,
    COUNT(DISTINCT tablename) as tables_with_policies,
    COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
AND policyname LIKE '%can insert%';

