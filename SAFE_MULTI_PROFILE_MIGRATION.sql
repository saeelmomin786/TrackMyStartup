-- =====================================================
-- SAFE MULTI-PROFILE MIGRATION (Backward Compatible)
-- =====================================================
-- This script safely adds multi-profile support WITHOUT breaking existing functionality
-- Existing users continue to work normally
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Step 1: Create user_profiles table (if not exists)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'Investor',
    
    -- Role-specific fields
    startup_name TEXT,
    center_name TEXT,
    firm_name TEXT,
    
    -- Codes
    investor_code TEXT,
    investment_advisor_code TEXT,
    investment_advisor_code_entered TEXT,
    ca_code TEXT,
    cs_code TEXT,
    mentor_code TEXT,
    
    -- Profile information
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    company TEXT,
    company_type TEXT,
    currency TEXT,
    
    -- Verification documents
    government_id TEXT,
    ca_license TEXT,
    cs_license TEXT,
    verification_documents TEXT[],
    profile_photo_url TEXT,
    logo_url TEXT,
    proof_of_business_url TEXT,
    financial_advisor_license_url TEXT,
    
    -- Profile metadata
    is_profile_complete BOOLEAN DEFAULT false,
    registration_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One profile per role per user
    UNIQUE(auth_user_id, role)
);

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_user_id ON public.user_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- Step 3: Create user_profile_sessions table
CREATE TABLE IF NOT EXISTS public.user_profile_sessions (
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    current_profile_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: SAFELY migrate existing users (only if not already migrated)
-- This creates profiles from existing users table WITHOUT deleting anything
DO $$
DECLARE
    user_record RECORD;
    new_profile_id UUID;
    profile_exists BOOLEAN;
BEGIN
    -- Loop through all existing users
    -- Select only core columns that definitely exist (id, email, name, role are required)
    -- Other columns are handled with NULL/defaults in INSERT
    FOR user_record IN 
        SELECT 
            id, 
            email, 
            name, 
            role,
            registration_date,
            created_at,
            updated_at
        FROM public.users
    LOOP
        -- Check if profile already exists for this user
        SELECT EXISTS(
            SELECT 1 FROM public.user_profiles 
            WHERE auth_user_id = user_record.id AND role = user_record.role
        ) INTO profile_exists;
        
        -- Only create profile if it doesn't exist
        IF NOT profile_exists THEN
            new_profile_id := gen_random_uuid();
            
            -- Create profile from existing user data
            -- Select only columns that exist, using subquery to handle missing columns
            INSERT INTO public.user_profiles (
                id, auth_user_id, email, name, role,
                startup_name, center_name, firm_name,
                investor_code, investment_advisor_code, investment_advisor_code_entered,
                ca_code, cs_code,
                phone, address, city, state, country, company, company_type, currency,
                government_id, ca_license, cs_license, verification_documents,
                profile_photo_url, logo_url, proof_of_business_url, financial_advisor_license_url,
                is_profile_complete, registration_date, created_at, updated_at
            )
            -- Insert profile using VALUES with only core columns from user_record
            -- Optional columns are set to NULL (they may not exist in users table)
            INSERT INTO public.user_profiles (
                id, auth_user_id, email, name, role,
                startup_name, center_name, firm_name,
                investor_code, investment_advisor_code, investment_advisor_code_entered,
                ca_code, cs_code,
                phone, address, city, state, country, company, company_type, currency,
                government_id, ca_license, cs_license, verification_documents,
                profile_photo_url, logo_url, proof_of_business_url, financial_advisor_license_url,
                is_profile_complete, registration_date, created_at, updated_at
            )
            VALUES (
                new_profile_id,
                user_record.id,
                user_record.email,
                user_record.name,
                user_record.role,
                NULL, -- startup_name (will be populated from separate query if exists)
                NULL, -- center_name
                NULL, -- firm_name
                NULL, -- investor_code
                NULL, -- investment_advisor_code
                NULL, -- investment_advisor_code_entered
                NULL, -- ca_code
                NULL, -- cs_code
                NULL, -- phone
                NULL, -- address
                NULL, -- city
                NULL, -- state
                NULL, -- country
                NULL, -- company
                NULL, -- company_type
                NULL, -- currency
                NULL, -- government_id
                NULL, -- ca_license
                NULL, -- cs_license
                NULL, -- verification_documents
                NULL, -- profile_photo_url
                NULL, -- logo_url
                NULL, -- proof_of_business_url
                NULL, -- financial_advisor_license_url
                false, -- is_profile_complete (default)
                COALESCE(user_record.registration_date, CURRENT_DATE),
                COALESCE(user_record.created_at, NOW()),
                COALESCE(user_record.updated_at, NOW())
            );
            
            -- Update optional columns using JSON aggregation (safer - handles missing columns)
            -- This approach uses JSON to safely extract columns that may or may not exist
            DO $$
            DECLARE
                user_json JSONB;
                col_name TEXT;
            BEGIN
                -- Get user data as JSON (this safely handles missing columns)
                SELECT to_jsonb(u.*) INTO user_json
                FROM public.users u
                WHERE u.id = user_record.id;
                
                -- Update columns that exist in the JSON
                IF user_json ? 'startup_name' THEN
                    UPDATE public.user_profiles SET startup_name = (user_json->>'startup_name')::TEXT WHERE id = new_profile_id;
                END IF;
                IF user_json ? 'center_name' THEN
                    UPDATE public.user_profiles SET center_name = (user_json->>'center_name')::TEXT WHERE id = new_profile_id;
                END IF;
                IF user_json ? 'firm_name' THEN
                    UPDATE public.user_profiles SET firm_name = (user_json->>'firm_name')::TEXT WHERE id = new_profile_id;
                END IF;
                IF user_json ? 'investor_code' THEN
                    UPDATE public.user_profiles SET investor_code = (user_json->>'investor_code')::TEXT WHERE id = new_profile_id;
                END IF;
                IF user_json ? 'investment_advisor_code' THEN
                    UPDATE public.user_profiles SET investment_advisor_code = (user_json->>'investment_advisor_code')::TEXT WHERE id = new_profile_id;
                END IF;
                IF user_json ? 'investment_advisor_code_entered' THEN
                    UPDATE public.user_profiles SET investment_advisor_code_entered = (user_json->>'investment_advisor_code_entered')::TEXT WHERE id = new_profile_id;
                END IF;
                IF user_json ? 'ca_code' THEN
                    UPDATE public.user_profiles SET ca_code = (user_json->>'ca_code')::TEXT WHERE id = new_profile_id;
                END IF;
                IF user_json ? 'cs_code' THEN
                    UPDATE public.user_profiles SET cs_code = (user_json->>'cs_code')::TEXT WHERE id = new_profile_id;
                END IF;
                IF user_json ? 'phone' THEN
                    UPDATE public.user_profiles SET phone = (user_json->>'phone')::TEXT WHERE id = new_profile_id;
                END IF;
                IF user_json ? 'address' THEN
                    UPDATE public.user_profiles SET address = (user_json->>'address')::TEXT WHERE id = new_profile_id;
                END IF;
                IF user_json ? 'city' THEN
                    UPDATE public.user_profiles SET city = (user_json->>'city')::TEXT WHERE id = new_profile_id;
                END IF;
                IF user_json ? 'state' THEN
                    UPDATE public.user_profiles SET state = (user_json->>'state')::TEXT WHERE id = new_profile_id;
                END IF;
                IF user_json ? 'country' THEN
                    UPDATE public.user_profiles SET country = (user_json->>'country')::TEXT WHERE id = new_profile_id;
                END IF;
                IF user_json ? 'company' THEN
                    UPDATE public.user_profiles SET company = (user_json->>'company')::TEXT WHERE id = new_profile_id;
                END IF;
                IF user_json ? 'company_type' THEN
                    UPDATE public.user_profiles SET company_type = (user_json->>'company_type')::TEXT WHERE id = new_profile_id;
                END IF;
                IF user_json ? 'government_id' THEN
                    UPDATE public.user_profiles SET government_id = (user_json->>'government_id')::TEXT WHERE id = new_profile_id;
                END IF;
                IF user_json ? 'ca_license' THEN
                    UPDATE public.user_profiles SET ca_license = (user_json->>'ca_license')::TEXT WHERE id = new_profile_id;
                END IF;
                IF user_json ? 'cs_license' THEN
                    UPDATE public.user_profiles SET cs_license = (user_json->>'cs_license')::TEXT WHERE id = new_profile_id;
                END IF;
                IF user_json ? 'verification_documents' THEN
                    UPDATE public.user_profiles SET verification_documents = (user_json->'verification_documents')::TEXT[] WHERE id = new_profile_id;
                END IF;
                IF user_json ? 'profile_photo_url' THEN
                    UPDATE public.user_profiles SET profile_photo_url = (user_json->>'profile_photo_url')::TEXT WHERE id = new_profile_id;
                END IF;
                IF user_json ? 'logo_url' THEN
                    UPDATE public.user_profiles SET logo_url = (user_json->>'logo_url')::TEXT WHERE id = new_profile_id;
                END IF;
                IF user_json ? 'proof_of_business_url' THEN
                    UPDATE public.user_profiles SET proof_of_business_url = (user_json->>'proof_of_business_url')::TEXT WHERE id = new_profile_id;
                END IF;
                IF user_json ? 'financial_advisor_license_url' THEN
                    UPDATE public.user_profiles SET financial_advisor_license_url = (user_json->>'financial_advisor_license_url')::TEXT WHERE id = new_profile_id;
                END IF;
            END $$;
            
            -- Set as active profile (only if no session exists)
            INSERT INTO public.user_profile_sessions (auth_user_id, current_profile_id, updated_at)
            VALUES (user_record.id, new_profile_id, NOW())
            ON CONFLICT (auth_user_id) DO NOTHING;
            
            RAISE NOTICE 'Migrated user: % (email: %) to profile: %', user_record.id, user_record.email, new_profile_id;
        ELSE
            RAISE NOTICE 'Profile already exists for user: % (email: %)', user_record.id, user_record.email;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migration completed successfully';
END $$;

-- Step 5: Create helper functions

-- Function to get current active profile (with fallback to users table)
CREATE OR REPLACE FUNCTION get_current_profile_safe(auth_user_uuid UUID)
RETURNS TABLE (
    profile_id UUID,
    auth_user_id UUID,
    email TEXT,
    name TEXT,
    role user_role,
    startup_name TEXT,
    center_name TEXT,
    firm_name TEXT,
    investor_code TEXT,
    investment_advisor_code TEXT,
    investment_advisor_code_entered TEXT,
    ca_code TEXT,
    cs_code TEXT,
    mentor_code TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    company TEXT,
    company_type TEXT,
    currency TEXT,
    government_id TEXT,
    ca_license TEXT,
    cs_license TEXT,
    verification_documents TEXT[],
    profile_photo_url TEXT,
    logo_url TEXT,
    proof_of_business_url TEXT,
    financial_advisor_license_url TEXT,
    is_profile_complete BOOLEAN,
    registration_date DATE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    source_table TEXT
) AS $$
BEGIN
    -- First try to get from user_profiles (new system)
    RETURN QUERY
    SELECT 
        p.id::UUID,
        p.auth_user_id::UUID,
        p.email::TEXT,
        p.name::TEXT,
        p.role::user_role,
        p.startup_name::TEXT,
        p.center_name::TEXT,
        p.firm_name::TEXT,
        p.investor_code::TEXT,
        p.investment_advisor_code::TEXT,
        p.investment_advisor_code_entered::TEXT,
        p.ca_code::TEXT,
        p.cs_code::TEXT,
        p.mentor_code::TEXT,
        p.phone::TEXT,
        p.address::TEXT,
        p.city::TEXT,
        p.state::TEXT,
        p.country::TEXT,
        p.company::TEXT,
        p.company_type::TEXT,
        p.currency::TEXT,
        p.government_id::TEXT,
        p.ca_license::TEXT,
        p.cs_license::TEXT,
        p.verification_documents::TEXT[],
        p.profile_photo_url::TEXT,
        p.logo_url::TEXT,
        p.proof_of_business_url::TEXT,
        p.financial_advisor_license_url::TEXT,
        p.is_profile_complete::BOOLEAN,
        p.registration_date::DATE,
        p.created_at::TIMESTAMP WITH TIME ZONE,
        p.updated_at::TIMESTAMP WITH TIME ZONE,
        'user_profiles'::TEXT
    FROM public.user_profiles p
    INNER JOIN public.user_profile_sessions s ON s.current_profile_id = p.id
    WHERE s.auth_user_id = auth_user_uuid;
    
    -- If no profile found, fallback to users table (old system)
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            u.id::UUID,
            u.id::UUID as auth_user_id,
            u.email::TEXT,
            u.name::TEXT,
            u.role::user_role,
            u.startup_name::TEXT,
            u.center_name::TEXT,
            u.firm_name::TEXT,
            u.investor_code::TEXT,
            u.investment_advisor_code::TEXT,
            u.investment_advisor_code_entered::TEXT,
            u.ca_code::TEXT,
            u.cs_code::TEXT,
            NULL::TEXT as mentor_code,
            u.phone::TEXT,
            u.address::TEXT,
            u.city::TEXT,
            u.state::TEXT,
            u.country::TEXT,
            u.company::TEXT,
            u.company_type::TEXT,
            u.currency::TEXT,
            u.government_id::TEXT,
            u.ca_license::TEXT,
            u.cs_license::TEXT,
            u.verification_documents::TEXT[],
            u.profile_photo_url::TEXT,
            u.logo_url::TEXT,
            u.proof_of_business_url::TEXT,
            u.financial_advisor_license_url::TEXT,
            u.is_profile_complete::BOOLEAN,
            u.registration_date::DATE,
            u.created_at::TIMESTAMP WITH TIME ZONE,
            u.updated_at::TIMESTAMP WITH TIME ZONE,
            'users'::TEXT
        FROM public.users u
        WHERE u.id = auth_user_uuid;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all profiles for a user
CREATE OR REPLACE FUNCTION get_user_profiles(auth_user_uuid UUID)
RETURNS TABLE (
    id UUID,
    auth_user_id UUID,
    email TEXT,
    name TEXT,
    role user_role,
    startup_name TEXT,
    center_name TEXT,
    firm_name TEXT,
    is_profile_complete BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.auth_user_id,
        p.email,
        p.name,
        p.role,
        p.startup_name,
        p.center_name,
        p.firm_name,
        p.is_profile_complete,
        p.created_at
    FROM public.user_profiles p
    WHERE p.auth_user_id = auth_user_uuid
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to switch active profile
CREATE OR REPLACE FUNCTION switch_profile(auth_user_uuid UUID, profile_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    profile_exists BOOLEAN;
BEGIN
    -- Verify the profile belongs to this user
    SELECT EXISTS(
        SELECT 1 FROM public.user_profiles 
        WHERE id = profile_uuid AND auth_user_id = auth_user_uuid
    ) INTO profile_exists;
    
    IF NOT profile_exists THEN
        RAISE EXCEPTION 'Profile does not belong to this user';
    END IF;
    
    -- Update or insert session
    INSERT INTO public.user_profile_sessions (auth_user_id, current_profile_id, updated_at)
    VALUES (auth_user_uuid, profile_uuid, NOW())
    ON CONFLICT (auth_user_id) 
    DO UPDATE SET current_profile_id = profile_uuid, updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create RLS policies

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profiles
DROP POLICY IF EXISTS "Users can view their own profiles" ON public.user_profiles;
CREATE POLICY "Users can view their own profiles" ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = auth_user_id);

-- Users can insert their own profiles
DROP POLICY IF EXISTS "Users can insert their own profiles" ON public.user_profiles;
CREATE POLICY "Users can insert their own profiles" ON public.user_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = auth_user_id);

-- Users can update their own profiles
DROP POLICY IF EXISTS "Users can update their own profiles" ON public.user_profiles;
CREATE POLICY "Users can update their own profiles" ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = auth_user_id);

-- Users can delete their own profiles
DROP POLICY IF EXISTS "Users can delete their own profiles" ON public.user_profiles;
CREATE POLICY "Users can delete their own profiles" ON public.user_profiles
    FOR DELETE
    USING (auth.uid() = auth_user_id);

-- Enable RLS on user_profile_sessions
ALTER TABLE public.user_profile_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own session
DROP POLICY IF EXISTS "Users can view their own session" ON public.user_profile_sessions;
CREATE POLICY "Users can view their own session" ON public.user_profile_sessions
    FOR SELECT
    USING (auth.uid() = auth_user_id);

-- Users can update their own session
DROP POLICY IF EXISTS "Users can update their own session" ON public.user_profile_sessions;
CREATE POLICY "Users can update their own session" ON public.user_profile_sessions
    FOR UPDATE
    USING (auth.uid() = auth_user_id);

-- Users can insert their own session
DROP POLICY IF EXISTS "Users can insert their own session" ON public.user_profile_sessions;
CREATE POLICY "Users can insert their own session" ON public.user_profile_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = auth_user_id);

-- Step 7: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at_trigger ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at_trigger
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_updated_at();

-- Step 8: Verification queries
SELECT 
    'Total profiles created' as info,
    COUNT(*) as count
FROM public.user_profiles;

SELECT 
    'Total sessions created' as info,
    COUNT(*) as count
FROM public.user_profile_sessions;

SELECT 
    role,
    COUNT(*) as profile_count
FROM public.user_profiles
GROUP BY role
ORDER BY profile_count DESC;

-- =====================================================
-- IMPORTANT: This migration is SAFE and BACKWARD COMPATIBLE
-- - Old users table still works
-- - Existing functionality is preserved
-- - New multi-profile features are added
-- =====================================================


