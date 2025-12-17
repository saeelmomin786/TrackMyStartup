-- =====================================================
-- FIX RLS POLICIES FOR ALL DASHBOARDS
-- =====================================================
-- This script fixes RLS policies for tables that non-Startup dashboards
-- (Investor, Investment Advisor, Mentor, etc.) need to write to
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. FIX due_diligence_requests TABLE
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own due diligence requests" ON public.due_diligence_requests;
DROP POLICY IF EXISTS "Users can view their own due diligence requests" ON public.due_diligence_requests;
DROP POLICY IF EXISTS "Users can update their own due diligence requests" ON public.due_diligence_requests;
DROP POLICY IF EXISTS "Startups can view due diligence requests for their startups" ON public.due_diligence_requests;

-- INSERT policy: Allow authenticated users to create due diligence requests
CREATE POLICY "Users can insert their own due diligence requests" 
ON public.due_diligence_requests
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- SELECT policy: Users can view their own requests, startups can view requests for their startups
CREATE POLICY "Users can view their own due diligence requests" 
ON public.due_diligence_requests
FOR SELECT 
TO authenticated
USING (
    -- Users can view their own requests
    auth.uid() = user_id
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

-- UPDATE policy: Users can update their own requests, startups can update requests for their startups
CREATE POLICY "Users can update their own due diligence requests" 
ON public.due_diligence_requests
FOR UPDATE 
TO authenticated
USING (
    auth.uid() = user_id
    OR
    EXISTS (
        SELECT 1 FROM public.startups s
        WHERE s.id::text = due_diligence_requests.startup_id
        AND s.user_id = auth.uid()
    )
)
WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS (
        SELECT 1 FROM public.startups s
        WHERE s.id::text = due_diligence_requests.startup_id
        AND s.user_id = auth.uid()
    )
);

-- =====================================================
-- 2. FIX investor_favorites TABLE (if exists)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_favorites') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Investors can manage their own favorites" ON public.investor_favorites;
        DROP POLICY IF EXISTS "Investment Advisors can insert their own favorites" ON public.investor_favorites;
        DROP POLICY IF EXISTS "Investment Advisors can view their own favorites" ON public.investor_favorites;
        DROP POLICY IF EXISTS "Investment Advisors can delete their own favorites" ON public.investor_favorites;
        DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.investor_favorites;
        DROP POLICY IF EXISTS "Users can view their own favorites" ON public.investor_favorites;
        DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.investor_favorites;

        -- INSERT policy
        CREATE POLICY "Users can insert their own favorites" 
        ON public.investor_favorites
        FOR INSERT 
        TO authenticated
        WITH CHECK (
            auth.uid() = investor_id
            OR
            -- Support both user_profiles and users table
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.id::text = investor_favorites.investor_id::text
            )
        );

        -- SELECT policy
        CREATE POLICY "Users can view their own favorites" 
        ON public.investor_favorites
        FOR SELECT 
        TO authenticated
        USING (
            auth.uid()::text = investor_id::text
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.id::text = investor_favorites.investor_id::text
            )
        );

        -- DELETE policy
        CREATE POLICY "Users can delete their own favorites" 
        ON public.investor_favorites
        FOR DELETE 
        TO authenticated
        USING (
            auth.uid()::text = investor_id::text
            OR
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.id::text = investor_favorites.investor_id::text
            )
        );
        
        RAISE NOTICE '✅ Fixed RLS policies for investor_favorites table';
    ELSE
        RAISE NOTICE '⏭️  Skipping investor_favorites table (does not exist)';
    END IF;
END $$;

-- =====================================================
-- 3. FIX investment_offers TABLE (if users need to update)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investment_offers') THEN
        -- Check if UPDATE policy exists and fix it
        DROP POLICY IF EXISTS "Users can update their own investment offers" ON public.investment_offers;

        CREATE POLICY "Users can update their own investment offers" 
        ON public.investment_offers
        FOR UPDATE 
        TO authenticated
        USING (
            -- Investors can update their own offers
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Investor'
                AND up.id::text = investment_offers.investor_id::text
            )
            OR
            -- Legacy: Check users table
            EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                AND u.role = 'Investor'
                AND u.id::text = investment_offers.investor_id::text
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Investor'
                AND up.id::text = investment_offers.investor_id::text
            )
            OR
            EXISTS (
                SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                AND u.role = 'Investor'
                AND u.id::text = investment_offers.investor_id::text
            )
        );
        
        RAISE NOTICE '✅ Fixed RLS policies for investment_offers table';
    ELSE
        RAISE NOTICE '⏭️  Skipping investment_offers table (does not exist)';
    END IF;
END $$;

-- =====================================================
-- 4. FIX co_investment_opportunities TABLE (if exists)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'co_investment_opportunities') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Investment Advisors can insert co-investment opportunities" ON public.co_investment_opportunities;
        DROP POLICY IF EXISTS "Investment Advisors can update co-investment opportunities" ON public.co_investment_opportunities;

        -- INSERT policy
        CREATE POLICY "Investment Advisors can insert co-investment opportunities" 
        ON public.co_investment_opportunities
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
        
        RAISE NOTICE '✅ Fixed RLS policies for co_investment_opportunities table';
    ELSE
        RAISE NOTICE '⏭️  Skipping co_investment_opportunities table (does not exist)';
    END IF;
END $$;

-- =====================================================
-- 5. FIX mentor_profiles TABLE (if exists)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mentor_profiles') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Mentors can update their own profile" ON public.mentor_profiles;
        DROP POLICY IF EXISTS "Mentors can insert their own profile" ON public.mentor_profiles;

        -- INSERT policy
        CREATE POLICY "Mentors can insert their own profile" 
        ON public.mentor_profiles
        FOR INSERT 
        TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Mentor'
                AND up.id = mentor_profiles.profile_id
            )
        );

        -- UPDATE policy
        CREATE POLICY "Mentors can update their own profile" 
        ON public.mentor_profiles
        FOR UPDATE 
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Mentor'
                AND up.id = mentor_profiles.profile_id
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.user_profiles up
                WHERE up.auth_user_id = auth.uid()
                AND up.role = 'Mentor'
                AND up.id = mentor_profiles.profile_id
            )
        );
        
        RAISE NOTICE '✅ Fixed RLS policies for mentor_profiles table';
    ELSE
        RAISE NOTICE '⏭️  Skipping mentor_profiles table (does not exist)';
    END IF;
END $$;

-- =====================================================
-- 6. FIX investor_profiles TABLE (if exists)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_profiles') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Investors can update their own profile" ON public.investor_profiles;
        DROP POLICY IF EXISTS "Investors can insert their own profile" ON public.investor_profiles;

        -- INSERT policy
        CREATE POLICY "Investors can insert their own profile" 
        ON public.investor_profiles
        FOR INSERT 
        TO authenticated
        WITH CHECK (
            user_id = auth.uid()
        );

        -- UPDATE policy
        CREATE POLICY "Investors can update their own profile" 
        ON public.investor_profiles
        FOR UPDATE 
        TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
        
        RAISE NOTICE '✅ Fixed RLS policies for investor_profiles table';
    ELSE
        RAISE NOTICE '⏭️  Skipping investor_profiles table (does not exist)';
    END IF;
END $$;

-- =====================================================
-- 7. FIX investment_advisor_profiles TABLE (if exists)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investment_advisor_profiles') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Investment Advisors can update their own profile" ON public.investment_advisor_profiles;
        DROP POLICY IF EXISTS "Investment Advisors can insert their own profile" ON public.investment_advisor_profiles;

        -- INSERT policy
        CREATE POLICY "Investment Advisors can insert their own profile" 
        ON public.investment_advisor_profiles
        FOR INSERT 
        TO authenticated
        WITH CHECK (
            user_id = auth.uid()
        );

        -- UPDATE policy
        CREATE POLICY "Investment Advisors can update their own profile" 
        ON public.investment_advisor_profiles
        FOR UPDATE 
        TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
        
        RAISE NOTICE '✅ Fixed RLS policies for investment_advisor_profiles table';
    ELSE
        RAISE NOTICE '⏭️  Skipping investment_advisor_profiles table (does not exist)';
    END IF;
END $$;

-- =====================================================
-- 8. SUMMARY
-- =====================================================

SELECT 
    '✅ RLS Policies Fixed' as status,
    'All dashboard write operations should now work' as note,
    'Try saving data in Investor, Investment Advisor, Mentor dashboards' as result;

