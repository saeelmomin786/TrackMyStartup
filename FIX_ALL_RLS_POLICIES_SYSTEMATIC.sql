-- =====================================================
-- SYSTEMATIC RLS POLICY FIX FOR ALL TABLES
-- =====================================================
-- This script fixes RLS policies based on actual table structure:
-- 1. Checks foreign key constraints to determine correct column usage
-- 2. Uses auth.uid() for tables with FK to users(id)
-- 3. Supports both user_profiles and users tables
-- 4. Handles different column names (user_id, investor_id, advisor_id, etc.)
-- =====================================================

-- =====================================================
-- HELPER FUNCTION: Get auth user ID from profile
-- =====================================================
-- This function helps convert profile IDs to auth user IDs
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
-- TABLE 1: investor_favorites
-- =====================================================
-- Foreign Key: investor_id REFERENCES users(id)
-- Must use: auth.uid() (not profile ID)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_favorites') THEN
        DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.investor_favorites;
        DROP POLICY IF EXISTS "Users can view their own favorites" ON public.investor_favorites;
        DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.investor_favorites;
        
        -- INSERT: Only allow auth.uid() (satisfies FK to users(id))
        CREATE POLICY "Users can insert their own favorites" 
        ON public.investor_favorites FOR INSERT TO authenticated
        WITH CHECK (
            investor_id = auth.uid()
            AND (
                EXISTS (SELECT 1 FROM public.user_profiles WHERE auth_user_id = auth.uid() AND role IN ('Investor', 'Investment Advisor'))
                OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('Investor', 'Investment Advisor'))
            )
        );
        
        -- SELECT: Allow viewing own favorites
        CREATE POLICY "Users can view their own favorites" 
        ON public.investor_favorites FOR SELECT TO authenticated
        USING (investor_id = auth.uid());
        
        -- DELETE: Allow deleting own favorites
        CREATE POLICY "Users can delete their own favorites" 
        ON public.investor_favorites FOR DELETE TO authenticated
        USING (investor_id = auth.uid());
        
        RAISE NOTICE '✅ Fixed investor_favorites policies';
    END IF;
END $$;

-- =====================================================
-- TABLE 2: investment_offers
-- =====================================================
-- Check if investor_id has FK to users(id)
DO $$
DECLARE
    has_fk_to_users BOOLEAN;
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investment_offers') THEN
        -- Check if investor_id has FK to users(id)
        SELECT EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'investment_offers'
            AND kcu.column_name = 'investor_id'
            AND ccu.table_name = 'users'
            AND ccu.column_name = 'id'
        ) INTO has_fk_to_users;
        
        DROP POLICY IF EXISTS "Users can insert their own investment offers" ON public.investment_offers;
        DROP POLICY IF EXISTS "Users can view their own investment offers" ON public.investment_offers;
        DROP POLICY IF EXISTS "Users can update their own investment offers" ON public.investment_offers;
        
        IF has_fk_to_users THEN
            -- Must use auth.uid() for FK constraint
            CREATE POLICY "Users can insert their own investment offers" 
            ON public.investment_offers FOR INSERT TO authenticated
            WITH CHECK (investor_id = auth.uid());
            
            CREATE POLICY "Users can view their own investment offers" 
            ON public.investment_offers FOR SELECT TO authenticated
            USING (true); -- Allow all authenticated users to view
            
            CREATE POLICY "Users can update their own investment offers" 
            ON public.investment_offers FOR UPDATE TO authenticated
            USING (investor_id = auth.uid())
            WITH CHECK (investor_id = auth.uid());
        ELSE
            -- No FK constraint, can use profile ID
            CREATE POLICY "Users can insert their own investment offers" 
            ON public.investment_offers FOR INSERT TO authenticated
            WITH CHECK (
                investor_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.user_profiles 
                    WHERE auth_user_id = auth.uid() 
                    AND (role = 'Investor' OR role = 'Investment Advisor')
                    AND id = investor_id
                )
            );
            
            CREATE POLICY "Users can view their own investment offers" 
            ON public.investment_offers FOR SELECT TO authenticated
            USING (true);
            
            CREATE POLICY "Users can update their own investment offers" 
            ON public.investment_offers FOR UPDATE TO authenticated
            USING (
                investor_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.user_profiles 
                    WHERE auth_user_id = auth.uid() 
                    AND (role = 'Investor' OR role = 'Investment Advisor')
                    AND id = investor_id
                )
            )
            WITH CHECK (
                investor_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.user_profiles 
                    WHERE auth_user_id = auth.uid() 
                    AND (role = 'Investor' OR role = 'Investment Advisor')
                    AND id = investor_id
                )
            );
        END IF;
        
        RAISE NOTICE '✅ Fixed investment_offers policies (FK check: %)', has_fk_to_users;
    END IF;
END $$;

-- =====================================================
-- TABLE 3: due_diligence_requests
-- =====================================================
DO $$
DECLARE
    has_fk_to_users BOOLEAN;
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'due_diligence_requests') THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'due_diligence_requests'
            AND kcu.column_name = 'user_id'
            AND ccu.table_name = 'users'
            AND ccu.column_name = 'id'
        ) INTO has_fk_to_users;
        
        DROP POLICY IF EXISTS "Users can insert their own due diligence requests" ON public.due_diligence_requests;
        DROP POLICY IF EXISTS "Users can view their own due diligence requests" ON public.due_diligence_requests;
        DROP POLICY IF EXISTS "Users can update their own due diligence requests" ON public.due_diligence_requests;
        
        IF has_fk_to_users THEN
            CREATE POLICY "Users can insert their own due diligence requests" 
            ON public.due_diligence_requests FOR INSERT TO authenticated
            WITH CHECK (user_id = auth.uid());
            
            CREATE POLICY "Users can view their own due diligence requests" 
            ON public.due_diligence_requests FOR SELECT TO authenticated
            USING (
                user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.startups s
                    WHERE s.id::text = due_diligence_requests.startup_id::text
                    AND s.user_id = auth.uid()
                )
                OR EXISTS (
                    SELECT 1 FROM public.user_profiles 
                    WHERE auth_user_id = auth.uid() 
                    AND role = 'Investment Advisor'
                )
            );
            
            CREATE POLICY "Users can update their own due diligence requests" 
            ON public.due_diligence_requests FOR UPDATE TO authenticated
            USING (user_id = auth.uid())
            WITH CHECK (user_id = auth.uid());
        ELSE
            -- Support both auth.uid() and profile IDs
            CREATE POLICY "Users can insert their own due diligence requests" 
            ON public.due_diligence_requests FOR INSERT TO authenticated
            WITH CHECK (
                user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.user_profiles 
                    WHERE auth_user_id = auth.uid() 
                    AND id::text = user_id::text
                )
            );
            
            CREATE POLICY "Users can view their own due diligence requests" 
            ON public.due_diligence_requests FOR SELECT TO authenticated
            USING (
                user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.user_profiles 
                    WHERE auth_user_id = auth.uid() 
                    AND id::text = user_id::text
                )
            );
            
            CREATE POLICY "Users can update their own due diligence requests" 
            ON public.due_diligence_requests FOR UPDATE TO authenticated
            USING (
                user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.user_profiles 
                    WHERE auth_user_id = auth.uid() 
                    AND id::text = user_id::text
                )
            )
            WITH CHECK (
                user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.user_profiles 
                    WHERE auth_user_id = auth.uid() 
                    AND id::text = user_id::text
                )
            );
        END IF;
        
        RAISE NOTICE '✅ Fixed due_diligence_requests policies (FK check: %)', has_fk_to_users;
    END IF;
END $$;

-- =====================================================
-- TABLE 4: startup_addition_requests
-- =====================================================
-- Uses investor_code (TEXT), not user_id
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
        
        RAISE NOTICE '✅ Fixed startup_addition_requests policies';
    END IF;
END $$;

-- =====================================================
-- TABLE 5: advisor_added_startups
-- =====================================================
-- advisor_id is VARCHAR(255), not UUID
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
        
        RAISE NOTICE '✅ Fixed advisor_added_startups policies';
    END IF;
END $$;

-- =====================================================
-- TABLE 6: mentor_startup_assignments
-- =====================================================
DO $$
DECLARE
    has_fk_to_users BOOLEAN;
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mentor_startup_assignments') THEN
        SELECT EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.table_name = 'mentor_startup_assignments'
            AND kcu.column_name = 'mentor_id'
            AND ccu.table_name = 'users'
            AND ccu.column_name = 'id'
        ) INTO has_fk_to_users;
        
        DROP POLICY IF EXISTS "Mentors can view their assignments" ON public.mentor_startup_assignments;
        DROP POLICY IF EXISTS "Mentors can update their assignments" ON public.mentor_startup_assignments;
        
        IF has_fk_to_users THEN
            CREATE POLICY "Mentors can view their assignments" 
            ON public.mentor_startup_assignments FOR SELECT TO authenticated
            USING (mentor_id = auth.uid());
            
            CREATE POLICY "Mentors can update their assignments" 
            ON public.mentor_startup_assignments FOR UPDATE TO authenticated
            USING (mentor_id = auth.uid())
            WITH CHECK (mentor_id = auth.uid());
        ELSE
            CREATE POLICY "Mentors can view their assignments" 
            ON public.mentor_startup_assignments FOR SELECT TO authenticated
            USING (
                mentor_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.user_profiles 
                    WHERE auth_user_id = auth.uid() 
                    AND role = 'Mentor'
                    AND id = mentor_id
                )
            );
            
            CREATE POLICY "Mentors can update their assignments" 
            ON public.mentor_startup_assignments FOR UPDATE TO authenticated
            USING (
                mentor_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.user_profiles 
                    WHERE auth_user_id = auth.uid() 
                    AND role = 'Mentor'
                    AND id = mentor_id
                )
            )
            WITH CHECK (
                mentor_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.user_profiles 
                    WHERE auth_user_id = auth.uid() 
                    AND role = 'Mentor'
                    AND id = mentor_id
                )
            );
        END IF;
        
        RAISE NOTICE '✅ Fixed mentor_startup_assignments policies (FK check: %)', has_fk_to_users;
    END IF;
END $$;

-- =====================================================
-- TABLE 7: mentor_requests
-- =====================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mentor_requests') THEN
        DROP POLICY IF EXISTS "Startups can insert mentor requests" ON public.mentor_requests;
        DROP POLICY IF EXISTS "Mentors can view their requests" ON public.mentor_requests;
        DROP POLICY IF EXISTS "Mentors can update their requests" ON public.mentor_requests;
        
        CREATE POLICY "Startups can insert mentor requests" 
        ON public.mentor_requests FOR INSERT TO authenticated
        WITH CHECK (
            requester_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE auth_user_id = auth.uid() 
                AND role = 'Startup'
                AND id = requester_id
            )
        );
        
        CREATE POLICY "Mentors can view their requests" 
        ON public.mentor_requests FOR SELECT TO authenticated
        USING (
            mentor_id = auth.uid()
            OR requester_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE auth_user_id = auth.uid() 
                AND (role = 'Mentor' OR role = 'Startup')
                AND (id = mentor_id OR id = requester_id)
            )
        );
        
        CREATE POLICY "Mentors can update their requests" 
        ON public.mentor_requests FOR UPDATE TO authenticated
        USING (
            mentor_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE auth_user_id = auth.uid() 
                AND role = 'Mentor'
                AND id = mentor_id
            )
        )
        WITH CHECK (
            mentor_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.user_profiles 
                WHERE auth_user_id = auth.uid() 
                AND role = 'Mentor'
                AND id = mentor_id
            )
        );
        
        RAISE NOTICE '✅ Fixed mentor_requests policies';
    END IF;
END $$;

-- =====================================================
-- TABLE 8: Profile tables (mentor_profiles, investor_profiles, investment_advisor_profiles)
-- =====================================================
DO $$
DECLARE
    profile_table TEXT;
    profile_role TEXT;
BEGIN
    FOR profile_table, profile_role IN 
        SELECT 'mentor_profiles', 'Mentor'
        UNION SELECT 'investor_profiles', 'Investor'
        UNION SELECT 'investment_advisor_profiles', 'Investment Advisor'
    LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = profile_table) THEN
            EXECUTE format('DROP POLICY IF EXISTS "%s can insert their own profile" ON public.%I', profile_role, profile_table);
            EXECUTE format('DROP POLICY IF EXISTS "%s can view their own profile" ON public.%I', profile_role, profile_table);
            EXECUTE format('DROP POLICY IF EXISTS "%s can update their own profile" ON public.%I', profile_role, profile_table);
            
            EXECUTE format('
                CREATE POLICY "%s can insert their own profile" 
                ON public.%I FOR INSERT TO authenticated
                WITH CHECK (
                    EXISTS (
                        SELECT 1 FROM public.user_profiles 
                        WHERE auth_user_id = auth.uid() 
                        AND role = %L
                    )
                    OR EXISTS (
                        SELECT 1 FROM public.users 
                        WHERE id = auth.uid() 
                        AND role = %L
                    )
                )
            ', profile_role, profile_table, profile_role, profile_role);
            
            EXECUTE format('
                CREATE POLICY "%s can view their own profile" 
                ON public.%I FOR SELECT TO authenticated
                USING (
                    user_id = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.user_profiles 
                        WHERE auth_user_id = auth.uid() 
                        AND (id::text = user_id::text OR auth_user_id = user_id)
                    )
                )
            ', profile_role, profile_table);
            
            EXECUTE format('
                CREATE POLICY "%s can update their own profile" 
                ON public.%I FOR UPDATE TO authenticated
                USING (
                    user_id = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.user_profiles 
                        WHERE auth_user_id = auth.uid() 
                        AND (id::text = user_id::text OR auth_user_id = user_id)
                    )
                )
                WITH CHECK (
                    user_id = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.user_profiles 
                        WHERE auth_user_id = auth.uid() 
                        AND (id::text = user_id::text OR auth_user_id = user_id)
                    )
                )
            ', profile_role, profile_table);
            
            RAISE NOTICE '✅ Fixed % policies', profile_table;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- TABLE 9: co_investment_opportunities
-- =====================================================
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
        USING (true); -- Allow all authenticated users to view
        
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
        
        RAISE NOTICE '✅ Fixed co_investment_opportunities policies';
    END IF;
END $$;

-- =====================================================
-- TABLE 10: investment_records
-- =====================================================
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
        
        RAISE NOTICE '✅ Fixed investment_records policies';
    END IF;
END $$;

-- =====================================================
-- TABLE 11: mentor_equity_records
-- =====================================================
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
        
        RAISE NOTICE '✅ Fixed mentor_equity_records policies';
    END IF;
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT 
    '✅ SYSTEMATIC RLS FIX COMPLETE' as status,
    'All RLS policies have been updated based on actual table structure and foreign key constraints' as note,
    'Run AUDIT_ALL_RLS_POLICIES.sql to verify all policies are correct' as result;




