-- =====================================================
-- BACKFILL: Create missing user_profiles rows before migration
-- =====================================================
-- Run this BEFORE running the migration script
-- This ensures all users in users table have corresponding user_profiles rows
-- =====================================================

-- Step 1: Create user_profiles rows for all users that don't have them
DO $$
DECLARE
    r RECORD;
    inserted_count INTEGER := 0;
    skipped_count INTEGER := 0;
BEGIN
    FOR r IN
        SELECT 
            u.id,
            u.email,
            u.name,
            u.role,
            COALESCE(u.investor_code, NULL) as investor_code,
            COALESCE(u.investment_advisor_code, NULL) as investment_advisor_code,
            COALESCE(u.investment_advisor_code_entered, NULL) as investment_advisor_code_entered,
            COALESCE(u.ca_code, NULL) as ca_code,
            COALESCE(u.cs_code, NULL) as cs_code,
            COALESCE(u.mentor_code, NULL) as mentor_code,
            COALESCE(u.phone, NULL) as phone,
            COALESCE(u.address, NULL) as address,
            COALESCE(u.city, NULL) as city,
            COALESCE(u.state, NULL) as state,
            COALESCE(u.country, NULL) as country,
            COALESCE(u.company, NULL) as company,
            COALESCE(u.company_type, NULL) as company_type,
            COALESCE(u.startup_name, NULL) as startup_name,
            COALESCE(u.center_name, NULL) as center_name,
            COALESCE(u.firm_name, NULL) as firm_name,
            COALESCE(u.government_id, NULL) as government_id,
            COALESCE(u.ca_license, NULL) as ca_license,
            COALESCE(u.cs_license, NULL) as cs_license,
            COALESCE(u.verification_documents, NULL) as verification_documents,
            COALESCE(u.profile_photo_url, NULL) as profile_photo_url,
            COALESCE(u.logo_url, NULL) as logo_url,
            COALESCE(u.proof_of_business_url, NULL) as proof_of_business_url,
            COALESCE(u.financial_advisor_license_url, NULL) as financial_advisor_license_url,
            COALESCE(u.registration_date, CURRENT_DATE) as registration_date,
            COALESCE(u.created_at, NOW()) as created_at,
            COALESCE(u.updated_at, NOW()) as updated_at
        FROM public.users u
        WHERE NOT EXISTS (
            SELECT 1 FROM public.user_profiles up 
            WHERE up.auth_user_id = u.id
        )
    LOOP
        BEGIN
            INSERT INTO public.user_profiles (
                auth_user_id,
                email,
                name,
                role,
                investor_code,
                investment_advisor_code,
                investment_advisor_code_entered,
                ca_code,
                cs_code,
                mentor_code,
                phone,
                address,
                city,
                state,
                country,
                company,
                company_type,
                startup_name,
                center_name,
                firm_name,
                government_id,
                ca_license,
                cs_license,
                verification_documents,
                profile_photo_url,
                logo_url,
                proof_of_business_url,
                financial_advisor_license_url,
                is_profile_complete,
                registration_date,
                created_at,
                updated_at
            )
            VALUES (
                r.id,
                r.email,
                r.name,
                r.role,
                r.investor_code,
                r.investment_advisor_code,
                r.investment_advisor_code_entered,
                r.ca_code,
                r.cs_code,
                r.mentor_code,
                r.phone,
                r.address,
                r.city,
                r.state,
                r.country,
                r.company,
                r.company_type,
                r.startup_name,
                r.center_name,
                r.firm_name,
                r.government_id,
                r.ca_license,
                r.cs_license,
                r.verification_documents,
                r.profile_photo_url,
                r.logo_url,
                r.proof_of_business_url,
                r.financial_advisor_license_url,
                COALESCE(r.is_profile_complete, false),
                r.registration_date,
                COALESCE(r.created_at, NOW()),
                COALESCE(r.updated_at, NOW())
            );
            
            inserted_count := inserted_count + 1;
        EXCEPTION WHEN OTHERS THEN
            skipped_count := skipped_count + 1;
            RAISE WARNING 'Skipped user % (email: %): %', r.id, r.email, SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE '✅ Backfill complete:';
    RAISE NOTICE '   - Created % new user_profiles rows', inserted_count;
    IF skipped_count > 0 THEN
        RAISE WARNING '   - Skipped % users due to errors', skipped_count;
    END IF;
END $$;

-- Step 2: Verify all users now have user_profiles
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ SUCCESS: All users have matching user_profiles rows'
        ELSE '⚠️ WARNING: ' || COUNT(*) || ' users still missing user_profiles rows'
    END as status
FROM public.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.auth_user_id = u.id
);

-- Step 3: Show summary
SELECT 
    (SELECT COUNT(*) FROM public.users) as total_users,
    (SELECT COUNT(*) FROM public.user_profiles) as total_user_profiles,
    (SELECT COUNT(*) FROM public.users u
     WHERE EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.auth_user_id = u.id)
    ) as users_with_profiles;


