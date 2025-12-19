-- =====================================================
-- COMPLETE MIGRATION: Shift all foreign keys from users to user_profiles
-- =====================================================
-- This script migrates all foreign key references from public.users 
-- to public.user_profiles (using auth_user_id as the key)
-- =====================================================

-- =====================================================
-- STEP 1: INVESTMENT_OFFERS TABLE
-- =====================================================

-- 1.1 Drop existing foreign key constraints
ALTER TABLE public.investment_offers 
DROP CONSTRAINT IF EXISTS investment_offers_investor_email_fkey;

ALTER TABLE public.investment_offers 
DROP CONSTRAINT IF EXISTS investment_offers_investor_id_fkey;

-- 1.2 Update investor_id column to reference user_profiles instead
-- First, ensure all investor_id values match valid auth_user_id values in user_profiles
UPDATE public.investment_offers io
SET investor_id = (
    SELECT up.auth_user_id 
    FROM public.user_profiles up 
    WHERE up.email = io.investor_email 
    AND up.role = 'Investor'
    LIMIT 1
)
WHERE investor_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.auth_user_id = io.investor_id
);

-- 1.3 Add new foreign key constraint to user_profiles
ALTER TABLE public.investment_offers 
ADD CONSTRAINT investment_offers_investor_id_fkey 
FOREIGN KEY (investor_id) 
REFERENCES public.user_profiles(auth_user_id) 
ON DELETE CASCADE;

-- 1.4 Update investor_email to reference user_profiles.email (optional, keeping email for compatibility)
-- Note: We'll keep investor_email as a text field but ensure it syncs with user_profiles
-- We can't create a FK on email directly since user_profiles doesn't have a unique constraint on email

-- =====================================================
-- STEP 2: CO_INVESTMENT_OFFERS TABLE
-- =====================================================

-- 2.1 Drop existing foreign key constraint
ALTER TABLE public.co_investment_offers 
DROP CONSTRAINT IF EXISTS co_investment_offers_investor_id_fkey;

-- 2.2 Update investor_id values to match user_profiles.auth_user_id
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
);

-- 2.3 Add new foreign key constraint to user_profiles
ALTER TABLE public.co_investment_offers 
ADD CONSTRAINT co_investment_offers_investor_id_fkey 
FOREIGN KEY (investor_id) 
REFERENCES public.user_profiles(auth_user_id) 
ON DELETE CASCADE;

-- =====================================================
-- STEP 3: STARTUPS TABLE
-- =====================================================

-- 3.1 Drop existing foreign key constraint
ALTER TABLE public.startups 
DROP CONSTRAINT IF EXISTS startups_user_id_fkey;

-- 3.2 Update user_id values to match user_profiles.auth_user_id for Startup role
UPDATE public.startups s
SET user_id = (
    SELECT up.auth_user_id 
    FROM public.user_profiles up 
    WHERE up.auth_user_id = s.user_id 
    AND up.role = 'Startup'
    LIMIT 1
)
WHERE user_id IS NOT NULL;

-- 3.3 Add new foreign key constraint to user_profiles
ALTER TABLE public.startups 
ADD CONSTRAINT startups_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.user_profiles(auth_user_id) 
ON DELETE CASCADE;

-- =====================================================
-- STEP 4: ADVISOR MANDATES TABLE
-- =====================================================

-- 4.1 Drop existing foreign key constraint (if exists)
ALTER TABLE public.advisor_mandates 
DROP CONSTRAINT IF EXISTS advisor_mandates_advisor_id_fkey;

-- 4.2 Update advisor_id values to match user_profiles.auth_user_id for Investment Advisor role
UPDATE public.advisor_mandates am
SET advisor_id = (
    SELECT up.auth_user_id 
    FROM public.user_profiles up 
    WHERE up.auth_user_id = am.advisor_id 
    AND up.role = 'Investment Advisor'
    LIMIT 1
)
WHERE advisor_id IS NOT NULL;

-- 4.3 Add new foreign key constraint to user_profiles
ALTER TABLE public.advisor_mandates 
ADD CONSTRAINT advisor_mandates_advisor_id_fkey 
FOREIGN KEY (advisor_id) 
REFERENCES public.user_profiles(auth_user_id) 
ON DELETE CASCADE;

-- =====================================================
-- STEP 5: ADVISOR_STARTUP_LINK_REQUESTS TABLE
-- =====================================================

-- 5.1 Drop existing foreign key constraints
ALTER TABLE public.advisor_startup_link_requests 
DROP CONSTRAINT IF EXISTS advisor_startup_link_requests_advisor_id_fkey,
DROP CONSTRAINT IF EXISTS advisor_startup_link_requests_startup_user_id_fkey;

-- 5.2 Update advisor_id
UPDATE public.advisor_startup_link_requests aslr
SET advisor_id = (
    SELECT up.auth_user_id 
    FROM public.user_profiles up 
    WHERE up.auth_user_id = aslr.advisor_id 
    AND up.role = 'Investment Advisor'
    LIMIT 1
)
WHERE advisor_id IS NOT NULL;

-- 5.3 Update startup_user_id
UPDATE public.advisor_startup_link_requests aslr
SET startup_user_id = (
    SELECT up.auth_user_id 
    FROM public.user_profiles up 
    WHERE up.auth_user_id = aslr.startup_user_id 
    AND up.role = 'Startup'
    LIMIT 1
)
WHERE startup_user_id IS NOT NULL;

-- 5.4 Add new foreign key constraints
ALTER TABLE public.advisor_startup_link_requests 
ADD CONSTRAINT advisor_startup_link_requests_advisor_id_fkey 
FOREIGN KEY (advisor_id) 
REFERENCES public.user_profiles(auth_user_id) 
ON DELETE CASCADE,
ADD CONSTRAINT advisor_startup_link_requests_startup_user_id_fkey 
FOREIGN KEY (startup_user_id) 
REFERENCES public.user_profiles(auth_user_id) 
ON DELETE CASCADE;

-- =====================================================
-- STEP 6: INVESTOR_CONNECTION_REQUESTS TABLE
-- =====================================================

-- 6.1 Drop existing foreign key constraints
ALTER TABLE public.investor_connection_requests 
DROP CONSTRAINT IF EXISTS investor_connection_requests_investor_id_fkey,
DROP CONSTRAINT IF EXISTS investor_connection_requests_requester_id_fkey;

-- 6.2 Update investor_id and requester_id
UPDATE public.investor_connection_requests icr
SET investor_id = (
    SELECT up.auth_user_id 
    FROM public.user_profiles up 
    WHERE up.auth_user_id = icr.investor_id 
    AND up.role = 'Investor'
    LIMIT 1
),
requester_id = (
    SELECT up.auth_user_id 
    FROM public.user_profiles up 
    WHERE up.auth_user_id = icr.requester_id
    LIMIT 1
)
WHERE investor_id IS NOT NULL OR requester_id IS NOT NULL;

-- 6.3 Add new foreign key constraints
ALTER TABLE public.investor_connection_requests 
ADD CONSTRAINT investor_connection_requests_investor_id_fkey 
FOREIGN KEY (investor_id) 
REFERENCES public.user_profiles(auth_user_id) 
ON DELETE CASCADE,
ADD CONSTRAINT investor_connection_requests_requester_id_fkey 
FOREIGN KEY (requester_id) 
REFERENCES public.user_profiles(auth_user_id) 
ON DELETE CASCADE;

-- =====================================================
-- STEP 7: ADVISOR_CONNECTION_REQUESTS TABLE
-- =====================================================

-- 7.1 Drop existing foreign key constraints
ALTER TABLE public.advisor_connection_requests 
DROP CONSTRAINT IF EXISTS advisor_connection_requests_advisor_id_fkey,
DROP CONSTRAINT IF EXISTS advisor_connection_requests_requester_id_fkey;

-- 7.2 Update advisor_id and requester_id
UPDATE public.advisor_connection_requests acr
SET advisor_id = (
    SELECT up.auth_user_id 
    FROM public.user_profiles up 
    WHERE up.auth_user_id = acr.advisor_id 
    AND up.role = 'Investment Advisor'
    LIMIT 1
),
requester_id = (
    SELECT up.auth_user_id 
    FROM public.user_profiles up 
    WHERE up.auth_user_id = acr.requester_id
    LIMIT 1
)
WHERE advisor_id IS NOT NULL OR requester_id IS NOT NULL;

-- 7.3 Add new foreign key constraints
ALTER TABLE public.advisor_connection_requests 
ADD CONSTRAINT advisor_connection_requests_advisor_id_fkey 
FOREIGN KEY (advisor_id) 
REFERENCES public.user_profiles(auth_user_id) 
ON DELETE CASCADE,
ADD CONSTRAINT advisor_connection_requests_requester_id_fkey 
FOREIGN KEY (requester_id) 
REFERENCES public.user_profiles(auth_user_id) 
ON DELETE CASCADE;

-- =====================================================
-- STEP 8: COLLABORATOR_RECOMMENDATIONS TABLE
-- =====================================================

-- 8.1 Drop existing foreign key constraints
ALTER TABLE public.collaborator_recommendations 
DROP CONSTRAINT IF EXISTS collaborator_recommendations_sender_user_id_fkey,
DROP CONSTRAINT IF EXISTS collaborator_recommendations_collaborator_user_id_fkey;

-- 8.2 Update sender_user_id and collaborator_user_id
UPDATE public.collaborator_recommendations cr
SET sender_user_id = (
    SELECT up.auth_user_id 
    FROM public.user_profiles up 
    WHERE up.auth_user_id = cr.sender_user_id
    LIMIT 1
),
collaborator_user_id = (
    SELECT up.auth_user_id 
    FROM public.user_profiles up 
    WHERE up.auth_user_id = cr.collaborator_user_id
    LIMIT 1
)
WHERE sender_user_id IS NOT NULL OR collaborator_user_id IS NOT NULL;

-- 8.3 Add new foreign key constraints
ALTER TABLE public.collaborator_recommendations 
ADD CONSTRAINT collaborator_recommendations_sender_user_id_fkey 
FOREIGN KEY (sender_user_id) 
REFERENCES public.user_profiles(auth_user_id) 
ON DELETE CASCADE,
ADD CONSTRAINT collaborator_recommendations_collaborator_user_id_fkey 
FOREIGN KEY (collaborator_user_id) 
REFERENCES public.user_profiles(auth_user_id) 
ON DELETE CASCADE;

-- =====================================================
-- STEP 9: INVESTOR_FAVORITES TABLE (if exists)
-- =====================================================

-- 9.1 Drop existing foreign key constraint if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'investor_favorites') THEN
        ALTER TABLE public.investor_favorites 
        DROP CONSTRAINT IF EXISTS investor_favorites_investor_id_fkey;
        
        -- Update investor_id
        UPDATE public.investor_favorites ifav
        SET investor_id = (
            SELECT up.auth_user_id 
            FROM public.user_profiles up 
            WHERE up.auth_user_id = ifav.investor_id 
            AND up.role = 'Investor'
            LIMIT 1
        )
        WHERE investor_id IS NOT NULL;
        
        -- Add new foreign key constraint
        ALTER TABLE public.investor_favorites 
        ADD CONSTRAINT investor_favorites_investor_id_fkey 
        FOREIGN KEY (investor_id) 
        REFERENCES public.user_profiles(auth_user_id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- STEP 10: CO_INVESTMENT_OPPORTUNITIES TABLE
-- =====================================================

-- 10.1 Drop existing foreign key constraint
ALTER TABLE public.co_investment_opportunities 
DROP CONSTRAINT IF EXISTS fk_listed_by_user_id;

-- 10.2 Update listed_by_user_id values to match user_profiles.auth_user_id
UPDATE public.co_investment_opportunities cio
SET listed_by_user_id = (
    SELECT up.auth_user_id 
    FROM public.user_profiles up 
    WHERE up.auth_user_id = cio.listed_by_user_id
    LIMIT 1
)
WHERE listed_by_user_id IS NOT NULL;

-- 10.3 Add new foreign key constraint to user_profiles
ALTER TABLE public.co_investment_opportunities 
ADD CONSTRAINT fk_listed_by_user_id 
FOREIGN KEY (listed_by_user_id) 
REFERENCES public.user_profiles(auth_user_id) 
ON DELETE CASCADE;

-- =====================================================
-- STEP 11: VERIFICATION REQUESTS TABLE (if uses user_id)
-- =====================================================

-- Check if verification_requests has user_id FK to users
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%user_id%' 
        AND table_name = 'verification_requests'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        -- Drop and recreate FK to user_profiles
        ALTER TABLE public.verification_requests 
        DROP CONSTRAINT IF EXISTS verification_requests_user_id_fkey;
        
        UPDATE public.verification_requests vr
        SET user_id = (
            SELECT up.auth_user_id 
            FROM public.user_profiles up 
            WHERE up.auth_user_id = vr.user_id
            LIMIT 1
        )
        WHERE user_id IS NOT NULL;
        
        ALTER TABLE public.verification_requests 
        ADD CONSTRAINT verification_requests_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES public.user_profiles(auth_user_id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- VERIFICATION: Show all foreign keys that now point to user_profiles
-- =====================================================

SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'user_profiles'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

