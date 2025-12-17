-- =====================================================
-- MULTI-PROFILE SYSTEM IMPLEMENTATION
-- =====================================================
-- This script creates a multi-profile system where one user (email)
-- can have multiple profiles (roles) like Mentor, Startup, Investor, etc.
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Step 1: Create user_profiles table
-- This table stores multiple profiles per auth user
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL, -- Denormalized for easier querying
    name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'Investor',
    
    -- Role-specific fields (nullable, only filled for relevant roles)
    startup_name TEXT,
    center_name TEXT,
    firm_name TEXT,
    
    -- Codes (role-specific)
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
    
    -- Ensure one profile per role per user (optional constraint)
    UNIQUE(auth_user_id, role)
);

-- Step 2: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_user_id ON public.user_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_startup_name ON public.user_profiles(startup_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_investor_code ON public.user_profiles(investor_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_investment_advisor_code ON public.user_profiles(investment_advisor_code);

-- Step 3: Create user_profile_sessions table to track active profile
-- This stores which profile is currently active for each auth user
CREATE TABLE IF NOT EXISTS public.user_profile_sessions (
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    current_profile_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Migrate existing users data to user_profiles
-- This creates one profile for each existing user
DO $$
DECLARE
    user_record RECORD;
    new_profile_id UUID;
BEGIN
    -- Loop through all existing users
    FOR user_record IN 
        SELECT * FROM public.users
    LOOP
        -- Generate new profile ID
        new_profile_id := gen_random_uuid();
        
        -- Create profile from existing user data
        INSERT INTO public.user_profiles (
            id,
            auth_user_id,
            email,
            name,
            role,
            startup_name,
            center_name,
            firm_name,
            investor_code,
            investment_advisor_code,
            investment_advisor_code_entered,
            ca_code,
            cs_code,
            phone,
            address,
            city,
            state,
            country,
            company,
            company_type,
            currency,
            government_id,
            ca_license,
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
        SELECT 
            new_profile_id,
            user_record.id,
            user_record.email,
            user_record.name,
            user_record.role,
            user_record.startup_name,
            user_record.center_name,
            user_record.firm_name,
            user_record.investor_code,
            user_record.investment_advisor_code,
            user_record.investment_advisor_code_entered,
            user_record.ca_code,
            user_record.cs_code,
            user_record.phone,
            user_record.address,
            user_record.city,
            user_record.state,
            user_record.country,
            user_record.company,
            user_record.company_type,
            user_record.currency,
            user_record.government_id,
            user_record.ca_license,
            user_record.verification_documents,
            user_record.profile_photo_url,
            user_record.logo_url,
            user_record.proof_of_business_url,
            user_record.financial_advisor_license_url,
            user_record.is_profile_complete,
            user_record.registration_date,
            user_record.created_at,
            user_record.updated_at
        FROM public.users
        WHERE id = user_record.id;
        
        -- Set this profile as active
        INSERT INTO public.user_profile_sessions (auth_user_id, current_profile_id, updated_at)
        VALUES (user_record.id, new_profile_id, NOW())
        ON CONFLICT (auth_user_id) 
        DO UPDATE SET current_profile_id = new_profile_id, updated_at = NOW();
        
        RAISE NOTICE 'Migrated user: % (email: %) to profile: %', user_record.id, user_record.email, new_profile_id;
    END LOOP;
    
    RAISE NOTICE 'Migration completed successfully';
END $$;

-- Step 5: Create helper functions

-- Function to get current active profile for a user
CREATE OR REPLACE FUNCTION get_current_profile(auth_user_uuid UUID)
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
    updated_at TIMESTAMP WITH TIME ZONE
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
        p.investor_code,
        p.investment_advisor_code,
        p.investment_advisor_code_entered,
        p.ca_code,
        p.cs_code,
        p.mentor_code,
        p.phone,
        p.address,
        p.city,
        p.state,
        p.country,
        p.company,
        p.company_type,
        p.currency,
        p.government_id,
        p.ca_license,
        p.cs_license,
        p.verification_documents,
        p.profile_photo_url,
        p.logo_url,
        p.proof_of_business_url,
        p.financial_advisor_license_url,
        p.is_profile_complete,
        p.registration_date,
        p.created_at,
        p.updated_at
    FROM public.user_profiles p
    INNER JOIN public.user_profile_sessions s ON s.current_profile_id = p.id
    WHERE s.auth_user_id = auth_user_uuid;
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

-- Step 6: Create RLS (Row Level Security) policies

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

-- Users can delete their own profiles (but not the last one)
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

-- Step 8: Add comments for documentation
COMMENT ON TABLE public.user_profiles IS 'Stores multiple profiles per auth user, allowing one email to have multiple roles';
COMMENT ON TABLE public.user_profile_sessions IS 'Tracks which profile is currently active for each auth user';
COMMENT ON FUNCTION get_current_profile(UUID) IS 'Returns the currently active profile for an auth user';
COMMENT ON FUNCTION get_user_profiles(UUID) IS 'Returns all profiles for an auth user';
COMMENT ON FUNCTION switch_profile(UUID, UUID) IS 'Switches the active profile for an auth user';

-- Step 9: Verification queries
-- Run these to verify the migration

-- Check if profiles were created
SELECT 
    'Total profiles created' as info,
    COUNT(*) as count
FROM public.user_profiles;

-- Check if sessions were created
SELECT 
    'Total sessions created' as info,
    COUNT(*) as count
FROM public.user_profile_sessions;

-- Check profile distribution by role
SELECT 
    role,
    COUNT(*) as profile_count
FROM public.user_profiles
GROUP BY role
ORDER BY profile_count DESC;

-- =====================================================
-- IMPORTANT NOTES:
-- =====================================================
-- 1. After running this script, you'll need to:
--    - Update your TypeScript types
--    - Update auth.ts to use user_profiles instead of users
--    - Update all queries to use get_current_profile()
--    - Create UI for profile switching
--    - Update signup flow to create profiles instead of users
--
-- 2. The old 'users' table can be kept for backward compatibility
--    or you can create a view that maps to user_profiles
--
-- 3. All existing foreign key relationships need to be updated
--    to reference user_profiles.id instead of users.id
-- =====================================================


