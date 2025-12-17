-- =====================================================
-- FIX RLS POLICIES FOR NON-STARTUP DASHBOARDS
-- =====================================================
-- This script fixes 403 errors for Investor, Investment Advisor, and Mentor dashboards
-- WITHOUT affecting the startups table (which is now working)
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. FIX due_diligence_requests TABLE
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'due_diligence_requests') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can insert their own due diligence requests" ON public.due_diligence_requests;
        DROP POLICY IF EXISTS "Users can view their own due diligence requests" ON public.due_diligence_requests;
        DROP POLICY IF EXISTS "Users can update their own due diligence requests" ON public.due_diligence_requests;
        
        -- INSERT policy: Allow authenticated users to create due diligence requests
        CREATE POLICY "Users can insert their own due diligence requests" 
        ON public.due_diligence_requests
        FOR INSERT 
        TO authenticated
        WITH CHECK (
            -- Support both user_profiles and users tables
            user_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.id::text = user_id::text
            )
        );
        
        -- SELECT policy: Users can view their own requests, startups can view requests for their startups
        CREATE POLICY "Users can view their own due diligence requests" 
        ON public.due_diligence_requests
        FOR SELECT 
        TO authenticated
        USING (
            -- Users can view their own requests
            user_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.id::text = user_id::text
            )
            OR
            -- Startups can view requests for their startups
            EXISTS (
                SELECT 1 FROM public.startups s
                WHERE s.id::text = due_diligence_requests.startup_id
                AND s.user_id = auth.uid()
            )
            OR
            -- Investment Advisors can view all requests
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Investment Advisor'
            )
            OR
            -- Legacy: Check users table for Investment Advisor role
            EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                AND u.role = 'Investment Advisor'
            )
        );
        
        -- UPDATE policy: Users can update their own requests
        CREATE POLICY "Users can update their own due diligence requests" 
        ON public.due_diligence_requests
        FOR UPDATE 
        TO authenticated
        USING (
            user_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.id::text = user_id::text
            )
            OR
            EXISTS (
                SELECT 1 FROM public.startups s
                WHERE s.id::text = due_diligence_requests.startup_id
                AND s.user_id = auth.uid()
            )
        )
        WITH CHECK (
            user_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.id::text = user_id::text
            )
            OR
            EXISTS (
                SELECT 1 FROM public.startups s
                WHERE s.id::text = due_diligence_requests.startup_id
                AND s.user_id = auth.uid()
            )
        );
        
        RAISE NOTICE '✅ Fixed due_diligence_requests policies';
    ELSE
        RAISE NOTICE '⚠️ due_diligence_requests table does not exist, skipping';
    END IF;
END $$;

-- =====================================================
-- 2. FIX investor_favorites TABLE
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_favorites') THEN
        DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.investor_favorites;
        DROP POLICY IF EXISTS "Users can view their own favorites" ON public.investor_favorites;
        DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.investor_favorites;
        
        -- INSERT policy
        -- Note: investor_favorites table uses 'investor_id' column, not 'user_id'
        -- CRITICAL: Foreign key constraint requires investor_id to reference users(id)
        -- So we MUST only allow auth.uid() to be inserted (not profile IDs)
        CREATE POLICY "Users can insert their own favorites" 
        ON public.investor_favorites
        FOR INSERT 
        TO authenticated
        WITH CHECK (
            -- CRITICAL: Only allow auth.uid() to satisfy foreign key constraint
            investor_id = auth.uid()
            AND
            -- Ensure user is Investor or Investment Advisor
            (
                EXISTS (
                    SELECT 1 FROM public.user_profiles up
                    WHERE up.auth_user_id = auth.uid()
                    AND (up.role = 'Investor' OR up.role = 'Investment Advisor')
                )
                OR
                EXISTS (
                    SELECT 1 FROM public.users u
                    WHERE u.id = auth.uid()
                    AND (u.role = 'Investor' OR u.role = 'Investment Advisor')
                )
            )
        );
        
        -- SELECT policy
        CREATE POLICY "Users can view their own favorites" 
        ON public.investor_favorites
        FOR SELECT 
        TO authenticated
        USING (
            investor_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND (up.role = 'Investor' OR up.role = 'Investment Advisor')
                AND up.id = investor_id
            )
            OR
            -- Legacy: Check users table
            EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                AND (u.role = 'Investor' OR u.role = 'Investment Advisor')
                AND u.id = investor_id
            )
        );
        
        -- DELETE policy
        CREATE POLICY "Users can delete their own favorites" 
        ON public.investor_favorites
        FOR DELETE 
        TO authenticated
        USING (
            investor_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND (up.role = 'Investor' OR up.role = 'Investment Advisor')
                AND up.id = investor_id
            )
            OR
            -- Legacy: Check users table
            EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                AND (u.role = 'Investor' OR u.role = 'Investment Advisor')
                AND u.id = investor_id
            )
        );
        
        RAISE NOTICE '✅ Fixed investor_favorites policies';
    END IF;
END $$;

-- =====================================================
-- 3. FIX investment_offers TABLE
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investment_offers') THEN
        DROP POLICY IF EXISTS "Users can update their own investment offers" ON public.investment_offers;
        DROP POLICY IF EXISTS "Users can insert their own investment offers" ON public.investment_offers;
        DROP POLICY IF EXISTS "Users can view their own investment offers" ON public.investment_offers;
        
        -- INSERT policy
        -- Note: investment_offers table uses 'investor_id' column, not 'user_id'
        CREATE POLICY "Users can insert their own investment offers" 
        ON public.investment_offers
        FOR INSERT 
        TO authenticated
        WITH CHECK (
            investor_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND (up.role = 'Investor' OR up.role = 'Investment Advisor')
                AND up.id = investor_id
            )
            OR
            -- Legacy: Check users table
            EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                AND (u.role = 'Investor' OR u.role = 'Investment Advisor')
                AND u.id = investor_id
            )
        );
        
        -- SELECT policy (allow viewing all offers for now, or restrict as needed)
        CREATE POLICY "Users can view their own investment offers" 
        ON public.investment_offers
        FOR SELECT 
        TO authenticated
        USING (true); -- Allow all authenticated users to view offers
        
        -- UPDATE policy
        CREATE POLICY "Users can update their own investment offers" 
        ON public.investment_offers
        FOR UPDATE 
        TO authenticated
        USING (
            investor_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND (up.role = 'Investor' OR up.role = 'Investment Advisor')
                AND up.id = investor_id
            )
            OR
            -- Legacy: Check users table
            EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                AND (u.role = 'Investor' OR u.role = 'Investment Advisor')
                AND u.id = investor_id
            )
        )
        WITH CHECK (
            investor_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND (up.role = 'Investor' OR up.role = 'Investment Advisor')
                AND up.id = investor_id
            )
            OR
            -- Legacy: Check users table
            EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                AND (u.role = 'Investor' OR u.role = 'Investment Advisor')
                AND u.id = investor_id
            )
        );
        
        RAISE NOTICE '✅ Fixed investment_offers policies';
    END IF;
END $$;

-- =====================================================
-- 4. FIX co_investment_opportunities TABLE
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'co_investment_opportunities') THEN
        DROP POLICY IF EXISTS "Investment Advisors can insert co-investment opportunities" ON public.co_investment_opportunities;
        DROP POLICY IF EXISTS "Investment Advisors can update co-investment opportunities" ON public.co_investment_opportunities;
        DROP POLICY IF EXISTS "Investment Advisors can view co-investment opportunities" ON public.co_investment_opportunities;
        
        -- INSERT policy
        CREATE POLICY "Investment Advisors can insert co-investment opportunities" 
        ON public.co_investment_opportunities
        FOR INSERT 
        TO authenticated
        WITH CHECK (
            -- Check if user is an Investment Advisor
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Investment Advisor'
            )
            OR
            EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                AND u.role = 'Investment Advisor'
            )
        );
        
        -- SELECT policy (allow viewing all opportunities)
        CREATE POLICY "Investment Advisors can view co-investment opportunities" 
        ON public.co_investment_opportunities
        FOR SELECT 
        TO authenticated
        USING (true);
        
        -- UPDATE policy
        CREATE POLICY "Investment Advisors can update co-investment opportunities" 
        ON public.co_investment_opportunities
        FOR UPDATE 
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Investment Advisor'
            )
            OR
            EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                AND u.role = 'Investment Advisor'
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Investment Advisor'
            )
            OR
            EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                AND u.role = 'Investment Advisor'
            )
        );
        
        RAISE NOTICE '✅ Fixed co_investment_opportunities policies';
    END IF;
END $$;

-- =====================================================
-- 5. FIX mentor_profiles TABLE
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mentor_profiles') THEN
        DROP POLICY IF EXISTS "Mentors can insert their own profile" ON public.mentor_profiles;
        DROP POLICY IF EXISTS "Mentors can update their own profile" ON public.mentor_profiles;
        DROP POLICY IF EXISTS "Mentors can view their own profile" ON public.mentor_profiles;
        
        -- INSERT policy
        CREATE POLICY "Mentors can insert their own profile" 
        ON public.mentor_profiles
        FOR INSERT 
        TO authenticated
        WITH CHECK (
            -- Check if user is a Mentor
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Mentor'
            )
            OR
            EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                AND u.role = 'Mentor'
            )
        );
        
        -- SELECT policy
        CREATE POLICY "Mentors can view their own profile" 
        ON public.mentor_profiles
        FOR SELECT 
        TO authenticated
        USING (
            user_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND (up.id::text = user_id::text OR up.auth_user_id = user_id)
            )
        );
        
        -- UPDATE policy
        CREATE POLICY "Mentors can update their own profile" 
        ON public.mentor_profiles
        FOR UPDATE 
        TO authenticated
        USING (
            user_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND (up.id::text = user_id::text OR up.auth_user_id = user_id)
            )
        )
        WITH CHECK (
            user_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND (up.id::text = user_id::text OR up.auth_user_id = user_id)
            )
        );
        
        RAISE NOTICE '✅ Fixed mentor_profiles policies';
    ELSE
        RAISE NOTICE '⚠️ mentor_profiles table does not exist, skipping';
    END IF;
END $$;

-- =====================================================
-- 6. FIX investor_profiles TABLE
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_profiles') THEN
        DROP POLICY IF EXISTS "Investors can insert their own profile" ON public.investor_profiles;
        DROP POLICY IF EXISTS "Investors can update their own profile" ON public.investor_profiles;
        DROP POLICY IF EXISTS "Investors can view their own profile" ON public.investor_profiles;
        
        -- INSERT policy
        CREATE POLICY "Investors can insert their own profile" 
        ON public.investor_profiles
        FOR INSERT 
        TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Investor'
            )
            OR
            EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                AND u.role = 'Investor'
            )
        );
        
        -- SELECT policy
        CREATE POLICY "Investors can view their own profile" 
        ON public.investor_profiles
        FOR SELECT 
        TO authenticated
        USING (
            user_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND (up.id::text = user_id::text OR up.auth_user_id = user_id)
            )
        );
        
        -- UPDATE policy
        CREATE POLICY "Investors can update their own profile" 
        ON public.investor_profiles
        FOR UPDATE 
        TO authenticated
        USING (
            user_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND (up.id::text = user_id::text OR up.auth_user_id = user_id)
            )
        )
        WITH CHECK (
            user_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND (up.id::text = user_id::text OR up.auth_user_id = user_id)
            )
        );
        
        RAISE NOTICE '✅ Fixed investor_profiles policies';
    END IF;
END $$;

-- =====================================================
-- 7. FIX investment_advisor_profiles TABLE
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investment_advisor_profiles') THEN
        DROP POLICY IF EXISTS "Investment Advisors can insert their own profile" ON public.investment_advisor_profiles;
        DROP POLICY IF EXISTS "Investment Advisors can update their own profile" ON public.investment_advisor_profiles;
        DROP POLICY IF EXISTS "Investment Advisors can view their own profile" ON public.investment_advisor_profiles;
        
        -- INSERT policy
        CREATE POLICY "Investment Advisors can insert their own profile" 
        ON public.investment_advisor_profiles
        FOR INSERT 
        TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Investment Advisor'
            )
            OR
            EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                AND u.role = 'Investment Advisor'
            )
        );
        
        -- SELECT policy
        CREATE POLICY "Investment Advisors can view their own profile" 
        ON public.investment_advisor_profiles
        FOR SELECT 
        TO authenticated
        USING (
            user_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND (up.id::text = user_id::text OR up.auth_user_id = user_id)
            )
        );
        
        -- UPDATE policy
        CREATE POLICY "Investment Advisors can update their own profile" 
        ON public.investment_advisor_profiles
        FOR UPDATE 
        TO authenticated
        USING (
            user_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND (up.id::text = user_id::text OR up.auth_user_id = user_id)
            )
        )
        WITH CHECK (
            user_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND (up.id::text = user_id::text OR up.auth_user_id = user_id)
            )
        );
        
        RAISE NOTICE '✅ Fixed investment_advisor_profiles policies';
    END IF;
END $$;

-- =====================================================
-- 8. FIX advisor_added_startups TABLE (Investment Advisor)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'advisor_added_startups') THEN
        DROP POLICY IF EXISTS "Advisors can insert their added startups" ON public.advisor_added_startups;
        DROP POLICY IF EXISTS "Advisors can update their added startups" ON public.advisor_added_startups;
        DROP POLICY IF EXISTS "Advisors can view their added startups" ON public.advisor_added_startups;
        DROP POLICY IF EXISTS "Advisors can delete their added startups" ON public.advisor_added_startups;
        
        -- INSERT policy
        CREATE POLICY "Advisors can insert their added startups" 
        ON public.advisor_added_startups
        FOR INSERT 
        TO authenticated
        WITH CHECK (
            -- advisor_id is VARCHAR(255), so we need to check both user_profiles and users
            advisor_id = auth.uid()::text
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Investment Advisor'
                AND up.id::text = advisor_id
            )
        );
        
        -- SELECT policy
        CREATE POLICY "Advisors can view their added startups" 
        ON public.advisor_added_startups
        FOR SELECT 
        TO authenticated
        USING (
            advisor_id = auth.uid()::text
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Investment Advisor'
                AND up.id::text = advisor_id
            )
        );
        
        -- UPDATE policy
        CREATE POLICY "Advisors can update their added startups" 
        ON public.advisor_added_startups
        FOR UPDATE 
        TO authenticated
        USING (
            advisor_id = auth.uid()::text
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Investment Advisor'
                AND up.id::text = advisor_id
            )
        )
        WITH CHECK (
            advisor_id = auth.uid()::text
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Investment Advisor'
                AND up.id::text = advisor_id
            )
        );
        
        -- DELETE policy
        CREATE POLICY "Advisors can delete their added startups" 
        ON public.advisor_added_startups
        FOR DELETE 
        TO authenticated
        USING (
            advisor_id = auth.uid()::text
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Investment Advisor'
                AND up.id::text = advisor_id
            )
        );
        
        RAISE NOTICE '✅ Fixed advisor_added_startups policies';
    END IF;
END $$;

-- =====================================================
-- 9. FIX investment_records TABLE (Investor/Startup)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investment_records') THEN
        DROP POLICY IF EXISTS "Users can insert investment records" ON public.investment_records;
        DROP POLICY IF EXISTS "Users can update investment records" ON public.investment_records;
        DROP POLICY IF EXISTS "Users can view investment records" ON public.investment_records;
        
        -- INSERT policy: Startups can insert records for their startups
        CREATE POLICY "Users can insert investment records" 
        ON public.investment_records
        FOR INSERT 
        TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.startups s
                WHERE s.id = investment_records.startup_id
                AND s.user_id = auth.uid()
            )
        );
        
        -- SELECT policy: Users can view records for their startups
        CREATE POLICY "Users can view investment records" 
        ON public.investment_records
        FOR SELECT 
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.startups s
                WHERE s.id = investment_records.startup_id
                AND s.user_id = auth.uid()
            )
            OR
            -- Investors can view records where they are the investor
            investor_code IN (
                SELECT investor_code FROM public.user_profiles
                WHERE auth_user_id = auth.uid()
                AND role = 'Investor'
            )
            OR
            investor_code IN (
                SELECT investor_code FROM public.users
                WHERE id = auth.uid()
                AND role = 'Investor'
            )
        );
        
        -- UPDATE policy: Startups can update records for their startups
        CREATE POLICY "Users can update investment records" 
        ON public.investment_records
        FOR UPDATE 
        TO authenticated
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
-- 10. FIX startup_addition_requests TABLE (Investor)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'startup_addition_requests') THEN
        DROP POLICY IF EXISTS "Investors can insert startup addition requests" ON public.startup_addition_requests;
        DROP POLICY IF EXISTS "Investors can update startup addition requests" ON public.startup_addition_requests;
        DROP POLICY IF EXISTS "Investors can view startup addition requests" ON public.startup_addition_requests;
        
        -- INSERT policy
        -- Note: startup_addition_requests table uses 'investor_code' column, not 'user_id'
        CREATE POLICY "Investors can insert startup addition requests" 
        ON public.startup_addition_requests
        FOR INSERT 
        TO authenticated
        WITH CHECK (
            -- Check if user's investor_code matches the request's investor_code
            investor_code IN (
                SELECT investor_code FROM public.user_profiles
                WHERE auth_user_id = auth.uid()
                AND role = 'Investor'
            )
            OR
            investor_code IN (
                SELECT investor_code FROM public.users
                WHERE id = auth.uid()
                AND role = 'Investor'
            )
        );
        
        -- SELECT policy
        CREATE POLICY "Investors can view startup addition requests" 
        ON public.startup_addition_requests
        FOR SELECT 
        TO authenticated
        USING (
            -- Investors can view requests with their investor_code
            investor_code IN (
                SELECT investor_code FROM public.user_profiles
                WHERE auth_user_id = auth.uid()
                AND role = 'Investor'
            )
            OR
            investor_code IN (
                SELECT investor_code FROM public.users
                WHERE id = auth.uid()
                AND role = 'Investor'
            )
            OR
            -- Admins can view all
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Admin'
            )
            OR
            EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                AND u.role = 'Admin'
            )
        );
        
        -- UPDATE policy
        CREATE POLICY "Investors can update startup addition requests" 
        ON public.startup_addition_requests
        FOR UPDATE 
        TO authenticated
        USING (
            -- Investors can update requests with their investor_code
            investor_code IN (
                SELECT investor_code FROM public.user_profiles
                WHERE auth_user_id = auth.uid()
                AND role = 'Investor'
            )
            OR
            investor_code IN (
                SELECT investor_code FROM public.users
                WHERE id = auth.uid()
                AND role = 'Investor'
            )
        )
        WITH CHECK (
            -- Ensure investor_code remains the same after update
            investor_code IN (
                SELECT investor_code FROM public.user_profiles
                WHERE auth_user_id = auth.uid()
                AND role = 'Investor'
            )
            OR
            investor_code IN (
                SELECT investor_code FROM public.users
                WHERE id = auth.uid()
                AND role = 'Investor'
            )
        );
        
        RAISE NOTICE '✅ Fixed startup_addition_requests policies';
    END IF;
END $$;

-- =====================================================
-- 11. FIX mentor_startup_assignments TABLE (Mentor)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mentor_startup_assignments') THEN
        DROP POLICY IF EXISTS "Mentors can view their assignments" ON public.mentor_startup_assignments;
        DROP POLICY IF EXISTS "Mentors can update their assignments" ON public.mentor_startup_assignments;
        
        -- SELECT policy
        CREATE POLICY "Mentors can view their assignments" 
        ON public.mentor_startup_assignments
        FOR SELECT 
        TO authenticated
        USING (
            mentor_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Mentor'
                AND up.id = mentor_id
            )
        );
        
        -- UPDATE policy
        CREATE POLICY "Mentors can update their assignments" 
        ON public.mentor_startup_assignments
        FOR UPDATE 
        TO authenticated
        USING (
            mentor_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Mentor'
                AND up.id = mentor_id
            )
        )
        WITH CHECK (
            mentor_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Mentor'
                AND up.id = mentor_id
            )
        );
        
        RAISE NOTICE '✅ Fixed mentor_startup_assignments policies';
    END IF;
END $$;

-- =====================================================
-- 12. FIX mentor_requests TABLE (Mentor)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mentor_requests') THEN
        DROP POLICY IF EXISTS "Mentors can view their requests" ON public.mentor_requests;
        DROP POLICY IF EXISTS "Mentors can update their requests" ON public.mentor_requests;
        DROP POLICY IF EXISTS "Startups can insert mentor requests" ON public.mentor_requests;
        
        -- INSERT policy: Startups can create requests
        CREATE POLICY "Startups can insert mentor requests" 
        ON public.mentor_requests
        FOR INSERT 
        TO authenticated
        WITH CHECK (
            requester_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Startup'
                AND up.id = requester_id
            )
        );
        
        -- SELECT policy: Mentors can view requests for them
        CREATE POLICY "Mentors can view their requests" 
        ON public.mentor_requests
        FOR SELECT 
        TO authenticated
        USING (
            mentor_id = auth.uid()
            OR
            requester_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND (up.role = 'Mentor' OR up.role = 'Startup')
                AND (up.id = mentor_id OR up.id = requester_id)
            )
        );
        
        -- UPDATE policy: Mentors can update requests (accept/reject)
        CREATE POLICY "Mentors can update their requests" 
        ON public.mentor_requests
        FOR UPDATE 
        TO authenticated
        USING (
            mentor_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Mentor'
                AND up.id = mentor_id
            )
        )
        WITH CHECK (
            mentor_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Mentor'
                AND up.id = mentor_id
            )
        );
        
        RAISE NOTICE '✅ Fixed mentor_requests policies';
    END IF;
END $$;

-- =====================================================
-- 13. FIX mentor_equity_records TABLE (Mentor)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mentor_equity_records') THEN
        DROP POLICY IF EXISTS "Users can view mentor equity records" ON public.mentor_equity_records;
        DROP POLICY IF EXISTS "Users can insert mentor equity records" ON public.mentor_equity_records;
        DROP POLICY IF EXISTS "Users can update mentor equity records" ON public.mentor_equity_records;
        
        -- INSERT policy: Startups can create records for their startups
        CREATE POLICY "Users can insert mentor equity records" 
        ON public.mentor_equity_records
        FOR INSERT 
        TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.startups s
                WHERE s.id = mentor_equity_records.startup_id
                AND s.user_id = auth.uid()
            )
        );
        
        -- SELECT policy: Startups and mentors can view records
        CREATE POLICY "Users can view mentor equity records" 
        ON public.mentor_equity_records
        FOR SELECT 
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.startups s
                WHERE s.id = mentor_equity_records.startup_id
                AND s.user_id = auth.uid()
            )
            OR
            -- Mentors can view records with their mentor_code
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Mentor'
                AND up.mentor_code = mentor_equity_records.mentor_code
            )
        );
        
        -- UPDATE policy: Startups can update records
        CREATE POLICY "Users can update mentor equity records" 
        ON public.mentor_equity_records
        FOR UPDATE 
        TO authenticated
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
    '✅ ALL NON-STARTUP DASHBOARD RLS POLICIES FIXED' as status,
    'All tables associated with Investor, Investment Advisor, and Mentor profiles now have correct RLS policies' as note,
    'Try saving data in all dashboards - 403 errors should be resolved' as result;

