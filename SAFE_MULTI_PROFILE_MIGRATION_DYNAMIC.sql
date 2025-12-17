-- =====================================================
-- SAFE MULTI-PROFILE MIGRATION (Dynamic - Handles Any Columns)
-- =====================================================
-- This script safely migrates users to profiles regardless of which columns exist
-- It uses JSON to safely extract only columns that exist
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

-- Step 4: SAFELY migrate existing users using JSON (handles any columns)
DO $$
DECLARE
    user_record RECORD;
    new_profile_id UUID;
    profile_exists BOOLEAN;
    user_json JSONB;
BEGIN
    -- Loop through all existing users
    FOR user_record IN 
        SELECT id, email, name, role, registration_date, created_at, updated_at
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
            
            -- Get user data as JSON (this safely handles ALL columns, even if they don't exist)
            SELECT to_jsonb(u.*) INTO user_json
            FROM public.users u
            WHERE u.id = user_record.id;
            
            -- Insert core required fields
            INSERT INTO public.user_profiles (
                id, auth_user_id, email, name, role,
                registration_date, created_at, updated_at
            )
            VALUES (
                new_profile_id,
                user_record.id,
                user_record.email,
                user_record.name,
                user_record.role,
                COALESCE(user_record.registration_date, CURRENT_DATE),
                COALESCE(user_record.created_at, NOW()),
                COALESCE(user_record.updated_at, NOW())
            );
            
            -- Update optional columns from JSON (only columns that exist in your users table)
            -- Based on your actual columns: startup_name, center_name, firm_name, investor_code, etc.
            IF user_json ? 'startup_name' AND user_json->>'startup_name' IS NOT NULL THEN
                UPDATE public.user_profiles SET startup_name = (user_json->>'startup_name')::TEXT WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'center_name' AND user_json->>'center_name' IS NOT NULL THEN
                UPDATE public.user_profiles SET center_name = (user_json->>'center_name')::TEXT WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'firm_name' AND user_json->>'firm_name' IS NOT NULL THEN
                UPDATE public.user_profiles SET firm_name = (user_json->>'firm_name')::TEXT WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'investor_code' AND user_json->>'investor_code' IS NOT NULL THEN
                UPDATE public.user_profiles SET investor_code = (user_json->>'investor_code')::TEXT WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'investment_advisor_code' AND user_json->>'investment_advisor_code' IS NOT NULL THEN
                UPDATE public.user_profiles SET investment_advisor_code = (user_json->>'investment_advisor_code')::TEXT WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'investment_advisor_code_entered' AND user_json->>'investment_advisor_code_entered' IS NOT NULL THEN
                UPDATE public.user_profiles SET investment_advisor_code_entered = (user_json->>'investment_advisor_code_entered')::TEXT WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'ca_code' AND user_json->>'ca_code' IS NOT NULL THEN
                UPDATE public.user_profiles SET ca_code = (user_json->>'ca_code')::TEXT WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'cs_code' AND user_json->>'cs_code' IS NOT NULL THEN
                UPDATE public.user_profiles SET cs_code = (user_json->>'cs_code')::TEXT WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'mentor_code' AND user_json->>'mentor_code' IS NOT NULL THEN
                UPDATE public.user_profiles SET mentor_code = (user_json->>'mentor_code')::TEXT WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'phone' AND user_json->>'phone' IS NOT NULL THEN
                UPDATE public.user_profiles SET phone = (user_json->>'phone')::TEXT WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'address' AND user_json->>'address' IS NOT NULL THEN
                UPDATE public.user_profiles SET address = (user_json->>'address')::TEXT WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'city' AND user_json->>'city' IS NOT NULL THEN
                UPDATE public.user_profiles SET city = (user_json->>'city')::TEXT WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'state' AND user_json->>'state' IS NOT NULL THEN
                UPDATE public.user_profiles SET state = (user_json->>'state')::TEXT WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'country' AND user_json->>'country' IS NOT NULL THEN
                UPDATE public.user_profiles SET country = (user_json->>'country')::TEXT WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'company' AND user_json->>'company' IS NOT NULL THEN
                UPDATE public.user_profiles SET company = (user_json->>'company')::TEXT WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'company_type' AND user_json->>'company_type' IS NOT NULL THEN
                UPDATE public.user_profiles SET company_type = (user_json->>'company_type')::TEXT WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'government_id' AND user_json->>'government_id' IS NOT NULL THEN
                UPDATE public.user_profiles SET government_id = (user_json->>'government_id')::TEXT WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'ca_license' AND user_json->>'ca_license' IS NOT NULL THEN
                UPDATE public.user_profiles SET ca_license = (user_json->>'ca_license')::TEXT WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'cs_license' AND user_json->>'cs_license' IS NOT NULL THEN
                UPDATE public.user_profiles SET cs_license = (user_json->>'cs_license')::TEXT WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'verification_documents' AND user_json->'verification_documents' IS NOT NULL AND user_json->'verification_documents' != 'null'::jsonb THEN
                -- Safely extract array from JSONB
                UPDATE public.user_profiles 
                SET verification_documents = (
                    SELECT array_agg(value::text)
                    FROM jsonb_array_elements(user_json->'verification_documents')
                )
                WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'profile_photo_url' AND user_json->>'profile_photo_url' IS NOT NULL THEN
                UPDATE public.user_profiles SET profile_photo_url = (user_json->>'profile_photo_url')::TEXT WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'logo_url' AND user_json->>'logo_url' IS NOT NULL THEN
                UPDATE public.user_profiles SET logo_url = (user_json->>'logo_url')::TEXT WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'proof_of_business_url' AND user_json->>'proof_of_business_url' IS NOT NULL THEN
                UPDATE public.user_profiles SET proof_of_business_url = (user_json->>'proof_of_business_url')::TEXT WHERE id = new_profile_id;
            END IF;
            
            IF user_json ? 'financial_advisor_license_url' AND user_json->>'financial_advisor_license_url' IS NOT NULL THEN
                UPDATE public.user_profiles SET financial_advisor_license_url = (user_json->>'financial_advisor_license_url')::TEXT WHERE id = new_profile_id;
            END IF;
            
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

-- Step 5: Create helper functions (same as before)
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
            NULL::TEXT as currency,
            u.government_id::TEXT,
            u.ca_license::TEXT,
            u.cs_license::TEXT,
            u.verification_documents::TEXT[],
            u.profile_photo_url::TEXT,
            u.logo_url::TEXT,
            u.proof_of_business_url::TEXT,
            u.financial_advisor_license_url::TEXT,
            false::BOOLEAN as is_profile_complete,
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

-- Step 6: Create RLS policies (same as before)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profiles" ON public.user_profiles;
CREATE POLICY "Users can view their own profiles" ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can insert their own profiles" ON public.user_profiles;
CREATE POLICY "Users can insert their own profiles" ON public.user_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can update their own profiles" ON public.user_profiles;
CREATE POLICY "Users can update their own profiles" ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can delete their own profiles" ON public.user_profiles;
CREATE POLICY "Users can delete their own profiles" ON public.user_profiles
    FOR DELETE
    USING (auth.uid() = auth_user_id);

ALTER TABLE public.user_profile_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own session" ON public.user_profile_sessions;
CREATE POLICY "Users can view their own session" ON public.user_profile_sessions
    FOR SELECT
    USING (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "Users can update their own session" ON public.user_profile_sessions;
CREATE POLICY "Users can update their own session" ON public.user_profile_sessions
    FOR UPDATE
    USING (auth.uid() = auth_user_id);

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
-- This migration is SAFE and handles ANY columns
-- It uses JSON to safely extract only columns that exist
-- =====================================================

