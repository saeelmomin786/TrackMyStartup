-- =====================================================
-- FIX ADVISOR STARTUP LINK REQUESTS TABLE
-- =====================================================
-- Run this ONLY if the table has VARCHAR columns instead of UUID
-- This will fix the data type mismatch

-- Step 1: Check current structure
SELECT '=== CHECKING CURRENT STRUCTURE ===' as step;

SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'advisor_startup_link_requests'
AND column_name IN ('advisor_id', 'startup_user_id');

-- Step 2: Fix advisor_id if it's VARCHAR
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'advisor_startup_link_requests'
        AND column_name = 'advisor_id'
        AND data_type = 'character varying'
    ) THEN
        RAISE NOTICE 'Fixing advisor_id from VARCHAR to UUID...';
        
        -- Drop foreign key constraint first
        ALTER TABLE public.advisor_startup_link_requests 
        DROP CONSTRAINT IF EXISTS advisor_startup_link_requests_advisor_id_fkey;
        
        -- Change column type
        ALTER TABLE public.advisor_startup_link_requests 
        ALTER COLUMN advisor_id TYPE UUID USING advisor_id::uuid;
        
        -- Re-add foreign key constraint
        ALTER TABLE public.advisor_startup_link_requests 
        ADD CONSTRAINT advisor_startup_link_requests_advisor_id_fkey 
        FOREIGN KEY (advisor_id) REFERENCES public.users(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ advisor_id fixed to UUID';
    ELSE
        RAISE NOTICE '✅ advisor_id is already UUID';
    END IF;
END $$;

-- Step 3: Fix startup_user_id if it's VARCHAR
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'advisor_startup_link_requests'
        AND column_name = 'startup_user_id'
        AND data_type = 'character varying'
    ) THEN
        RAISE NOTICE 'Fixing startup_user_id from VARCHAR to UUID...';
        
        -- Drop foreign key constraint first
        ALTER TABLE public.advisor_startup_link_requests 
        DROP CONSTRAINT IF EXISTS advisor_startup_link_requests_startup_user_id_fkey;
        
        -- Change column type
        ALTER TABLE public.advisor_startup_link_requests 
        ALTER COLUMN startup_user_id TYPE UUID USING startup_user_id::uuid;
        
        -- Re-add foreign key constraint
        ALTER TABLE public.advisor_startup_link_requests 
        ADD CONSTRAINT advisor_startup_link_requests_startup_user_id_fkey 
        FOREIGN KEY (startup_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
        
        RAISE NOTICE '✅ startup_user_id fixed to UUID';
    ELSE
        RAISE NOTICE '✅ startup_user_id is already UUID';
    END IF;
END $$;

-- Step 4: Fix RLS policies if they use ::text comparison
DO $$
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Advisors can view their own link requests" ON public.advisor_startup_link_requests;
    DROP POLICY IF EXISTS "Startups can view requests for their startups" ON public.advisor_startup_link_requests;
    DROP POLICY IF EXISTS "Advisors can create link requests" ON public.advisor_startup_link_requests;
    DROP POLICY IF EXISTS "Startups can update requests for their startups" ON public.advisor_startup_link_requests;
    
    RAISE NOTICE 'Dropped old policies';
    
    -- Create correct policies with UUID comparison
    CREATE POLICY "Advisors can view their own link requests" 
        ON public.advisor_startup_link_requests
        FOR SELECT
        USING (auth.uid() = advisor_id);
    
    CREATE POLICY "Startups can view requests for their startups" 
        ON public.advisor_startup_link_requests
        FOR SELECT
        USING (auth.uid() = startup_user_id);
    
    CREATE POLICY "Advisors can create link requests" 
        ON public.advisor_startup_link_requests
        FOR INSERT
        WITH CHECK (auth.uid() = advisor_id);
    
    CREATE POLICY "Startups can update requests for their startups" 
        ON public.advisor_startup_link_requests
        FOR UPDATE
        USING (auth.uid() = startup_user_id);
    
    RAISE NOTICE '✅ RLS policies fixed';
END $$;

-- Step 5: Verify final structure
SELECT '=== FINAL VERIFICATION ===' as step;

SELECT 
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('advisor_id', 'startup_user_id') AND data_type = 'uuid' 
        THEN '✅ CORRECT'
        WHEN column_name IN ('advisor_id', 'startup_user_id') AND data_type = 'character varying'
        THEN '❌ STILL VARCHAR - Fix failed'
        ELSE 'OK'
    END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'advisor_startup_link_requests'
AND column_name IN ('advisor_id', 'startup_user_id');

SELECT '=== FIX COMPLETE ===' as step;


