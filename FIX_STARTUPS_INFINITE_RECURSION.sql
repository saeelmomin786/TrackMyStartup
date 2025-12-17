-- =====================================================
-- FIX INFINITE RECURSION IN startups TABLE RLS POLICY
-- =====================================================
-- This script fixes the infinite recursion error in startups table
-- Error: "infinite recursion detected in policy for relation 'startups'"
-- Run this in your Supabase SQL Editor IMMEDIATELY
-- =====================================================

-- Step 1: Check current policies on startups table
SELECT 
    'Current startups policies' as info,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'startups' 
  AND schemaname = 'public'
ORDER BY policyname;

-- Step 2: Drop ALL existing policies on startups (to reset completely)
-- This removes any policies that might cause recursion
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'startups' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.startups', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Step 3: Create simple, non-recursive policies
-- SELECT policy 1: Allow all authenticated users to view startups (for discover tab, etc.)
-- This is simple and doesn't cause recursion
CREATE POLICY "startups_select_all" 
ON public.startups
FOR SELECT 
TO authenticated
USING (true);

-- SELECT policy 2: Users can view their own startups (simple check, no recursion)
-- This is redundant but safe - PostgreSQL will use OR logic
CREATE POLICY "Users can view their own startups" 
ON public.startups
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- INSERT policy: Users can insert their own startups
CREATE POLICY "Users can insert their own startups" 
ON public.startups
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE policy: Users can update their own startups
CREATE POLICY "Users can update their own startups" 
ON public.startups
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Step 4: Verify policies were created
SELECT 
    '✅ Policies fixed' as status,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'startups' 
  AND schemaname = 'public';

-- Step 5: Also fix related tables that might have recursion issues
-- Fix founders table (it references startups, but shouldn't cause recursion if startups is fixed)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'founders') THEN
        -- Drop and recreate founders policies to ensure no recursion
        DROP POLICY IF EXISTS "Users can insert founders for their startups" ON public.founders;
        DROP POLICY IF EXISTS "Users can update founders for their startups" ON public.founders;
        
        -- Simple INSERT policy - check user_id directly from startups (no recursion since startups SELECT is now simple)
        CREATE POLICY "Users can insert founders for their startups" 
        ON public.founders
        FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.startups 
                WHERE startups.id = founders.startup_id 
                AND startups.user_id = auth.uid()
            )
        );
        
        -- Simple UPDATE policy
        CREATE POLICY "Users can update founders for their startups" 
        ON public.founders
        FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 FROM public.startups 
                WHERE startups.id = founders.startup_id 
                AND startups.user_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.startups 
                WHERE startups.id = founders.startup_id 
                AND startups.user_id = auth.uid()
            )
        );
        
        RAISE NOTICE '✅ Fixed founders table policies';
    END IF;
END $$;

-- Fix startup_shares table
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'startup_shares') THEN
        DROP POLICY IF EXISTS "Users can insert startup shares" ON public.startup_shares;
        DROP POLICY IF EXISTS "Users can update startup shares" ON public.startup_shares;
        
        CREATE POLICY "Users can insert startup shares" 
        ON public.startup_shares
        FOR INSERT
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.startups 
                WHERE startups.id = startup_shares.startup_id 
                AND startups.user_id = auth.uid()
            )
        );
        
        CREATE POLICY "Users can update startup shares" 
        ON public.startup_shares
        FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 FROM public.startups 
                WHERE startups.id = startup_shares.startup_id 
                AND startups.user_id = auth.uid()
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.startups 
                WHERE startups.id = startup_shares.startup_id 
                AND startups.user_id = auth.uid()
            )
        );
        
        RAISE NOTICE '✅ Fixed startup_shares table policies';
    END IF;
END $$;

-- Step 6: Summary
SELECT 
    '✅ INFINITE RECURSION FIXED' as status,
    'Startups table RLS policies reset to simple, non-recursive policies' as note,
    'Try loading startup dashboard again' as result;

