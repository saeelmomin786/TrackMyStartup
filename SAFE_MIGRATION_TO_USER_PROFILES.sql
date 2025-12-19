-- =====================================================
-- SAFE MIGRATION: Shift foreign keys from users to user_profiles
-- =====================================================
-- This is a SAFER version that verifies data before migrating
-- =====================================================

-- =====================================================
-- STEP 0: VERIFICATION - Check data consistency
-- =====================================================

-- 0.1 Verify that user_profiles.auth_user_id = users.id for all existing users
DO $$
DECLARE
    mismatch_count INTEGER;
BEGIN
    -- Check if there are users in users table that don't have matching user_profiles
    SELECT COUNT(*) INTO mismatch_count
    FROM public.users u
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.auth_user_id = u.id
    );
    
    IF mismatch_count > 0 THEN
        RAISE WARNING '⚠️ Found % users in users table without matching user_profiles rows. Backfill needed!', mismatch_count;
        RAISE NOTICE 'Run backfill script first to create missing user_profiles rows.';
    ELSE
        RAISE NOTICE '✅ All users have matching user_profiles rows. Safe to proceed.';
    END IF;
END $$;

-- 0.2 Check investment_offers - verify all investor_id values exist in user_profiles
DO $$
DECLARE
    missing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_count
    FROM public.investment_offers io
    WHERE io.investor_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.auth_user_id = io.investor_id
    );
    
    IF missing_count > 0 THEN
        RAISE WARNING '⚠️ Found % investment_offers with investor_id not in user_profiles', missing_count;
    ELSE
        RAISE NOTICE '✅ All investment_offers.investor_id values exist in user_profiles';
    END IF;
END $$;

-- 0.3 Check co_investment_offers
DO $$
DECLARE
    missing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_count
    FROM public.co_investment_offers cio
    WHERE cio.investor_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.auth_user_id = cio.investor_id
    );
    
    IF missing_count > 0 THEN
        RAISE WARNING '⚠️ Found % co_investment_offers with investor_id not in user_profiles', missing_count;
    ELSE
        RAISE NOTICE '✅ All co_investment_offers.investor_id values exist in user_profiles';
    END IF;
END $$;

-- 0.4 Check startups
DO $$
DECLARE
    missing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_count
    FROM public.startups s
    WHERE s.user_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.auth_user_id = s.user_id
    );
    
    IF missing_count > 0 THEN
        RAISE WARNING '⚠️ Found % startups with user_id not in user_profiles', missing_count;
    ELSE
        RAISE NOTICE '✅ All startups.user_id values exist in user_profiles';
    END IF;
END $$;

-- =====================================================
-- STEP 1: INVESTMENT_OFFERS TABLE (SAFE VERSION)
-- =====================================================

-- 1.1 Drop existing foreign key constraints
ALTER TABLE public.investment_offers 
DROP CONSTRAINT IF EXISTS investment_offers_investor_email_fkey;

ALTER TABLE public.investment_offers 
DROP CONSTRAINT IF EXISTS investment_offers_investor_id_fkey;

-- 1.2 SAFE UPDATE: Only update investor_id if it doesn't exist in user_profiles
-- AND we can find a match by email. Otherwise, keep the existing value.
-- This preserves existing working data.
UPDATE public.investment_offers io
SET investor_id = (
    SELECT up.auth_user_id 
    FROM public.user_profiles up 
    WHERE up.email = io.investor_email 
    AND up.role = 'Investor'
    LIMIT 1
)
WHERE investor_id IS NOT NULL 
-- Only update if current investor_id doesn't exist in user_profiles
AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.auth_user_id = io.investor_id
)
-- AND we can find a match by email
AND EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.email = io.investor_email 
    AND up.role = 'Investor'
);

-- 1.3 Add new foreign key constraint to user_profiles
-- NOTE: Since user_profiles has UNIQUE(auth_user_id, role) allowing multiple profiles per user,
-- we can't create a direct FK constraint on auth_user_id alone.
-- Instead, we'll create an index for performance and rely on application-level referential integrity.
-- OR: Create a unique index for Investor role specifically if all investment_offers reference investors.

-- Check if all investment_offers reference Investor profiles
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM public.investment_offers io
    WHERE io.investor_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.auth_user_id = io.investor_id
        AND up.role = 'Investor'  -- Investment offers should reference Investor profiles
    );
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Cannot proceed: % investment_offers have investor_id values that do not match Investor profiles in user_profiles. Fix data first.', invalid_count;
    ELSE
        -- Create index for performance (FK constraint not possible due to multi-profile system)
        CREATE INDEX IF NOT EXISTS idx_investment_offers_investor_id 
        ON public.investment_offers(investor_id);
        
        -- Create unique index on user_profiles for Investor role to help with lookups
        CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_auth_user_id_investor 
        ON public.user_profiles(auth_user_id) 
        WHERE role = 'Investor';
        
        RAISE NOTICE '✅ Created indexes for investment_offers.investor_id -> user_profiles (Investor role)';
        RAISE NOTICE '⚠️ Note: Using index instead of FK constraint due to multi-profile system (UNIQUE auth_user_id, role)';
    END IF;
END $$;

-- =====================================================
-- STEP 2: CO_INVESTMENT_OFFERS TABLE (SAFE VERSION)
-- =====================================================

-- 2.1 Drop existing foreign key constraint
ALTER TABLE public.co_investment_offers 
DROP CONSTRAINT IF EXISTS co_investment_offers_investor_id_fkey;

-- 2.2 SAFE UPDATE: Only update if needed
UPDATE public.co_investment_offers cio
SET investor_id = (
    SELECT up.auth_user_id 
    FROM public.user_profiles up 
    WHERE up.email = cio.investor_email 
    AND up.role = 'Investor'
    LIMIT 1
)
WHERE investor_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.auth_user_id = cio.investor_id
)
AND EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.email = cio.investor_email 
    AND up.role = 'Investor'
);

-- 2.3 Create index instead of FK (due to multi-profile system)
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM public.co_investment_offers cio
    WHERE cio.investor_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.auth_user_id = cio.investor_id
        AND up.role = 'Investor'
    );
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Cannot proceed: % co_investment_offers have invalid investor_id values.', invalid_count;
    ELSE
        CREATE INDEX IF NOT EXISTS idx_co_investment_offers_investor_id 
        ON public.co_investment_offers(investor_id);
        
        RAISE NOTICE '✅ Created index for co_investment_offers.investor_id -> user_profiles (Investor role)';
        RAISE NOTICE '⚠️ Note: Using index instead of FK constraint due to multi-profile system';
    END IF;
END $$;

-- =====================================================
-- STEP 3: STARTUPS TABLE (SAFE VERSION)
-- =====================================================

-- 3.1 Drop existing foreign key constraint
ALTER TABLE public.startups 
DROP CONSTRAINT IF EXISTS startups_user_id_fkey;

-- 3.2 SAFE: Since user_id should already equal auth_user_id, no update needed
-- Just verify all values exist in user_profiles (checked in Step 0)

-- 3.3 Create index instead of FK (due to multi-profile system)
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM public.startups s
    WHERE s.user_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.auth_user_id = s.user_id
        AND up.role = 'Startup'
    );
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Cannot proceed: % startups have invalid user_id values.', invalid_count;
    ELSE
        CREATE INDEX IF NOT EXISTS idx_startups_user_id 
        ON public.startups(user_id);
        
        RAISE NOTICE '✅ Created index for startups.user_id -> user_profiles (Startup role)';
        RAISE NOTICE '⚠️ Note: Using index instead of FK constraint due to multi-profile system';
    END IF;
END $$;

-- =====================================================
-- STEP 4: CO_INVESTMENT_OPPORTUNITIES TABLE (SAFE VERSION)
-- =====================================================

-- 4.1 Drop existing foreign key constraint
ALTER TABLE public.co_investment_opportunities 
DROP CONSTRAINT IF EXISTS fk_listed_by_user_id;

-- 4.2 SAFE: Since listed_by_user_id should already equal auth_user_id, no update needed

-- 4.3 Create index instead of FK (due to multi-profile system)
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM public.co_investment_opportunities cio
    WHERE cio.listed_by_user_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM public.user_profiles up 
        WHERE up.auth_user_id = cio.listed_by_user_id
    );
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Cannot proceed: % co_investment_opportunities have invalid listed_by_user_id values.', invalid_count;
    ELSE
        CREATE INDEX IF NOT EXISTS idx_co_investment_opportunities_listed_by_user_id 
        ON public.co_investment_opportunities(listed_by_user_id);
        
        RAISE NOTICE '✅ Created index for co_investment_opportunities.listed_by_user_id -> user_profiles';
        RAISE NOTICE '⚠️ Note: Using index instead of FK constraint due to multi-profile system';
    END IF;
END $$;

-- =====================================================
-- FINAL VERIFICATION: Show all foreign keys pointing to user_profiles
-- =====================================================

-- Show indexes created for user_profiles references
SELECT 
    '✅ Migration Complete - Indexes Created' as status,
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND (
        indexname LIKE '%investor_id%' 
        OR indexname LIKE '%user_id%' 
        OR indexname LIKE '%listed_by_user_id%'
        OR indexname LIKE '%auth_user_id_investor%'
    )
ORDER BY tablename, indexname;

-- Note: Foreign key constraints were NOT created because user_profiles uses UNIQUE(auth_user_id, role)
-- which allows multiple profiles per user. Indexes are used instead for performance,
-- and referential integrity is maintained by application logic.


