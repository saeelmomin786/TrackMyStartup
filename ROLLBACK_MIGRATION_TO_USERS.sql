-- =====================================================
-- ROLLBACK: Revert foreign keys from user_profiles back to users
-- =====================================================
-- Use this ONLY if migration causes issues and you need to rollback
-- =====================================================

-- =====================================================
-- STEP 1: INVESTMENT_OFFERS TABLE - Revert to users
-- =====================================================

-- 1.1 Drop the user_profiles foreign key
ALTER TABLE public.investment_offers 
DROP CONSTRAINT IF EXISTS investment_offers_investor_id_fkey;

-- 1.2 Add back the users foreign key (if it existed before)
-- Note: We're reverting investor_id to point to users.id
ALTER TABLE public.investment_offers 
DROP CONSTRAINT IF EXISTS investment_offers_investor_id_users_fkey;

ALTER TABLE public.investment_offers 
ADD CONSTRAINT investment_offers_investor_id_users_fkey 
FOREIGN KEY (investor_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- 1.3 Also add back investor_email FK if it existed
ALTER TABLE public.investment_offers 
DROP CONSTRAINT IF EXISTS investment_offers_investor_email_fkey;

-- Only add if email FK is needed (check your original schema)
-- ALTER TABLE public.investment_offers 
-- ADD CONSTRAINT investment_offers_investor_email_fkey 
-- FOREIGN KEY (investor_email) 
-- REFERENCES public.users(email) 
-- ON DELETE CASCADE;

-- =====================================================
-- STEP 2: CO_INVESTMENT_OFFERS TABLE - Revert to users
-- =====================================================

-- 2.1 Drop the user_profiles foreign key
ALTER TABLE public.co_investment_offers 
DROP CONSTRAINT IF EXISTS co_investment_offers_investor_id_fkey;

-- 2.2 Add back the users foreign key
ALTER TABLE public.co_investment_offers 
ADD CONSTRAINT co_investment_offers_investor_id_users_fkey 
FOREIGN KEY (investor_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- =====================================================
-- STEP 3: STARTUPS TABLE - Revert to users
-- =====================================================

-- 3.1 Drop the user_profiles foreign key
ALTER TABLE public.startups 
DROP CONSTRAINT IF EXISTS startups_user_id_fkey;

-- 3.2 Add back the users foreign key
ALTER TABLE public.startups 
ADD CONSTRAINT startups_user_id_users_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- =====================================================
-- STEP 4: CO_INVESTMENT_OPPORTUNITIES TABLE - Revert to users
-- =====================================================

-- 4.1 Drop the user_profiles foreign key
ALTER TABLE public.co_investment_opportunities 
DROP CONSTRAINT IF EXISTS fk_listed_by_user_id;

-- 4.2 Add back the users foreign key
ALTER TABLE public.co_investment_opportunities 
ADD CONSTRAINT fk_listed_by_user_id_users 
FOREIGN KEY (listed_by_user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- =====================================================
-- STEP 5: ADVISOR_MANDATES TABLE - Revert to users
-- =====================================================

ALTER TABLE public.advisor_mandates 
DROP CONSTRAINT IF EXISTS advisor_mandates_advisor_id_fkey;

ALTER TABLE public.advisor_mandates 
ADD CONSTRAINT advisor_mandates_advisor_id_users_fkey 
FOREIGN KEY (advisor_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- =====================================================
-- STEP 6: ADVISOR_STARTUP_LINK_REQUESTS TABLE - Revert to users
-- =====================================================

ALTER TABLE public.advisor_startup_link_requests 
DROP CONSTRAINT IF EXISTS advisor_startup_link_requests_advisor_id_fkey,
DROP CONSTRAINT IF EXISTS advisor_startup_link_requests_startup_user_id_fkey;

ALTER TABLE public.advisor_startup_link_requests 
ADD CONSTRAINT advisor_startup_link_requests_advisor_id_users_fkey 
FOREIGN KEY (advisor_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE,
ADD CONSTRAINT advisor_startup_link_requests_startup_user_id_users_fkey 
FOREIGN KEY (startup_user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- =====================================================
-- STEP 7: INVESTOR_CONNECTION_REQUESTS TABLE - Revert to users
-- =====================================================

ALTER TABLE public.investor_connection_requests 
DROP CONSTRAINT IF EXISTS investor_connection_requests_investor_id_fkey,
DROP CONSTRAINT IF EXISTS investor_connection_requests_requester_id_fkey;

ALTER TABLE public.investor_connection_requests 
ADD CONSTRAINT investor_connection_requests_investor_id_users_fkey 
FOREIGN KEY (investor_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE,
ADD CONSTRAINT investor_connection_requests_requester_id_users_fkey 
FOREIGN KEY (requester_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- =====================================================
-- STEP 8: ADVISOR_CONNECTION_REQUESTS TABLE - Revert to users
-- =====================================================

ALTER TABLE public.advisor_connection_requests 
DROP CONSTRAINT IF EXISTS advisor_connection_requests_advisor_id_fkey,
DROP CONSTRAINT IF EXISTS advisor_connection_requests_requester_id_fkey;

ALTER TABLE public.advisor_connection_requests 
ADD CONSTRAINT advisor_connection_requests_advisor_id_users_fkey 
FOREIGN KEY (advisor_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE,
ADD CONSTRAINT advisor_connection_requests_requester_id_users_fkey 
FOREIGN KEY (requester_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- =====================================================
-- STEP 9: COLLABORATOR_RECOMMENDATIONS TABLE - Revert to users
-- =====================================================

ALTER TABLE public.collaborator_recommendations 
DROP CONSTRAINT IF EXISTS collaborator_recommendations_sender_user_id_fkey,
DROP CONSTRAINT IF EXISTS collaborator_recommendations_collaborator_user_id_fkey;

ALTER TABLE public.collaborator_recommendations 
ADD CONSTRAINT collaborator_recommendations_sender_user_id_users_fkey 
FOREIGN KEY (sender_user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE,
ADD CONSTRAINT collaborator_recommendations_collaborator_user_id_users_fkey 
FOREIGN KEY (collaborator_user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- =====================================================
-- STEP 10: INVESTOR_FAVORITES TABLE - Revert to users (if exists)
-- =====================================================

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'investor_favorites') THEN
        ALTER TABLE public.investor_favorites 
        DROP CONSTRAINT IF EXISTS investor_favorites_investor_id_fkey;
        
        ALTER TABLE public.investor_favorites 
        ADD CONSTRAINT investor_favorites_investor_id_users_fkey 
        FOREIGN KEY (investor_id) 
        REFERENCES public.users(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- STEP 11: VERIFICATION REQUESTS TABLE - Revert to users (if uses user_id)
-- =====================================================

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%user_id%' 
        AND table_name = 'verification_requests'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%user_profiles%'
    ) THEN
        ALTER TABLE public.verification_requests 
        DROP CONSTRAINT IF EXISTS verification_requests_user_id_fkey;
        
        ALTER TABLE public.verification_requests 
        ADD CONSTRAINT verification_requests_user_id_users_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES public.users(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- VERIFICATION: Show all foreign keys now pointing to users
-- =====================================================

SELECT 
    '✅ Rollback Complete' as status,
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
    AND ccu.table_name = 'users'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================
-- IMPORTANT: After Rollback
-- =====================================================

-- 1. Restore code changes if needed:
--    - Revert changes to lib/database.ts
--    - Revert changes to components (InvestorView.tsx, etc.)
--    - Revert SQL function changes

-- 2. Test all flows to ensure everything works again

-- 3. Investigate why migration failed before trying again


