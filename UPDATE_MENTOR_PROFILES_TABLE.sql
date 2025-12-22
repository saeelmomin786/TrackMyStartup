-- =====================================================
-- UPDATE MENTOR PROFILES TABLE WITH MISSING FIELDS
-- =====================================================
-- This script creates the mentor_profiles table if it doesn't exist
-- and adds missing fields that are used in the MentorProfileForm component
-- =====================================================

-- =====================================================
-- STEP 1: CREATE TABLE IF IT DOESN'T EXIST (MUST BE FIRST)
-- =====================================================
-- This ensures the base table exists with all required fields

CREATE TABLE IF NOT EXISTS public.mentor_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Basic Information
    mentor_name TEXT NOT NULL,
    mentor_type TEXT, -- e.g., "Industry Expert", "Serial Entrepreneur", "Corporate Executive", "Academic", "Other"
    location TEXT,
    website TEXT,
    linkedin_link TEXT,
    email TEXT,
    
    -- Mentoring Expertise
    expertise_areas TEXT[], -- Array of areas (e.g., "Product Development", "Marketing", "Sales", "Finance", etc.)
    sectors TEXT[], -- Array of sectors they mentor in
    mentoring_stages TEXT[], -- Array of stages (Pre-Seed, Seed, Series A, etc.)
    
    -- Experience
    years_of_experience INTEGER,
    companies_mentored INTEGER,
    companies_founded INTEGER,
    "current_role" TEXT,
    previous_companies TEXT[], -- Array of previous companies
    mentoring_experience TEXT, -- Description of mentoring experience
    
    -- Mentoring Approach
    mentoring_approach TEXT, -- Description of mentoring style/approach
    availability TEXT, -- e.g., "Full-time", "Part-time", "Advisory"
    preferred_engagement TEXT, -- e.g., "1-on-1", "Group Sessions", "Workshops"
    
    -- Fee Structure
    fee_type TEXT CHECK (fee_type IN ('Fees', 'Equity', 'Hybrid', 'Pro Bono')),
    fee_amount_min DECIMAL(15, 2),
    fee_amount_max DECIMAL(15, 2),
    fee_currency TEXT DEFAULT 'USD',
    equity_amount_min DECIMAL(15, 2), -- Stock Options amount in currency (same as fees)
    equity_amount_max DECIMAL(15, 2), -- Stock Options amount in currency (same as fees)
    fee_description TEXT, -- Additional description of fee structure
    
    -- Media
    logo_url TEXT,
    video_url TEXT, -- YouTube video URL
    media_type TEXT CHECK (media_type IN ('logo', 'video')) DEFAULT 'logo',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 2: ADD MISSING COLUMNS (IF TABLE ALREADY EXISTS)
-- =====================================================
-- These will only add columns if they don't already exist

-- Add mentoring_experience field
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mentor_profiles' 
        AND column_name = 'mentoring_experience'
    ) THEN
        ALTER TABLE public.mentor_profiles 
        ADD COLUMN mentoring_experience TEXT;
    END IF;
END $$;

-- Add fee_type field
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mentor_profiles' 
        AND column_name = 'fee_type'
    ) THEN
        ALTER TABLE public.mentor_profiles 
        ADD COLUMN fee_type TEXT CHECK (fee_type IN ('Fees', 'Equity', 'Hybrid', 'Pro Bono'));
    END IF;
END $$;

-- Add fee_amount_min field
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mentor_profiles' 
        AND column_name = 'fee_amount_min'
    ) THEN
        ALTER TABLE public.mentor_profiles 
        ADD COLUMN fee_amount_min DECIMAL(15, 2);
    END IF;
END $$;

-- Add fee_amount_max field
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mentor_profiles' 
        AND column_name = 'fee_amount_max'
    ) THEN
        ALTER TABLE public.mentor_profiles 
        ADD COLUMN fee_amount_max DECIMAL(15, 2);
    END IF;
END $$;

-- Add fee_currency field
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mentor_profiles' 
        AND column_name = 'fee_currency'
    ) THEN
        ALTER TABLE public.mentor_profiles 
        ADD COLUMN fee_currency TEXT DEFAULT 'USD';
    END IF;
END $$;

-- Add equity_amount_min field
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mentor_profiles' 
        AND column_name = 'equity_amount_min'
    ) THEN
        ALTER TABLE public.mentor_profiles 
        ADD COLUMN equity_amount_min DECIMAL(15, 2);
    END IF;
END $$;

-- Add equity_amount_max field
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mentor_profiles' 
        AND column_name = 'equity_amount_max'
    ) THEN
        ALTER TABLE public.mentor_profiles 
        ADD COLUMN equity_amount_max DECIMAL(15, 2);
    END IF;
END $$;

-- Add fee_description field
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mentor_profiles' 
        AND column_name = 'fee_description'
    ) THEN
        ALTER TABLE public.mentor_profiles 
        ADD COLUMN fee_description TEXT;
    END IF;
END $$;

-- =====================================================
-- STEP 3: CREATE INDEXES
-- =====================================================

-- Index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_user_id ON public.mentor_profiles(user_id);

-- Index on mentor_type for filtering
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_mentor_type ON public.mentor_profiles(mentor_type);

-- Index on expertise_areas for filtering (using GIN index for array)
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_expertise_areas ON public.mentor_profiles USING GIN(expertise_areas);

-- Index on sectors for filtering (using GIN index for array)
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_sectors ON public.mentor_profiles USING GIN(sectors);

-- Index on fee_type for filtering
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_fee_type ON public.mentor_profiles(fee_type);

-- =====================================================
-- STEP 4: ENABLE RLS (IF NOT ALREADY ENABLED)
-- =====================================================
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: CREATE/UPDATE RLS POLICIES
-- =====================================================
-- Note: These will replace any existing policies with the same names

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Mentors can view their own profile" ON public.mentor_profiles;
DROP POLICY IF EXISTS "Mentors can insert their own profile" ON public.mentor_profiles;
DROP POLICY IF EXISTS "Mentors can update their own profile" ON public.mentor_profiles;
DROP POLICY IF EXISTS "Mentors can delete their own profile" ON public.mentor_profiles;
DROP POLICY IF EXISTS "Public can view mentor profiles" ON public.mentor_profiles;
DROP POLICY IF EXISTS "Admins can view all mentor profiles" ON public.mentor_profiles;

-- Mentors can view their own profile
CREATE POLICY "Mentors can view their own profile" ON public.mentor_profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Mentors can insert their own profile
CREATE POLICY "Mentors can insert their own profile" ON public.mentor_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Mentors can update their own profile
CREATE POLICY "Mentors can update their own profile" ON public.mentor_profiles
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Mentors can delete their own profile
CREATE POLICY "Mentors can delete their own profile" ON public.mentor_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Public can view mentor profiles (for discovery)
CREATE POLICY "Public can view mentor profiles" ON public.mentor_profiles
    FOR SELECT USING (true);

-- Admins can view all mentor profiles
CREATE POLICY "Admins can view all mentor profiles" ON public.mentor_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'Admin'
        )
    );

-- =====================================================
-- STEP 6: CREATE TRIGGER FOR UPDATED_AT
-- =====================================================
-- This automatically updates the updated_at timestamp on row updates

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mentor_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS mentor_profiles_updated_at ON public.mentor_profiles;

-- Create trigger
CREATE TRIGGER mentor_profiles_updated_at
    BEFORE UPDATE ON public.mentor_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_mentor_profiles_updated_at();

-- =====================================================
-- STEP 7: VERIFY TABLE STRUCTURE
-- =====================================================
-- Run this to see all columns in the table

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'mentor_profiles'
ORDER BY ordinal_position;

-- =====================================================
-- STEP 8: VERIFY POLICIES
-- =====================================================
-- Run this to see all RLS policies on the table

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'mentor_profiles'
ORDER BY policyname;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. The table uses user_id which references auth.users(id)
-- 2. All RLS policies use auth.uid() to ensure mentors can only
--    modify their own profiles
-- 3. Public can view profiles for discovery purposes
-- 4. The updated_at field is automatically updated via trigger
-- 5. Fee amounts are stored as DECIMAL for precision
-- 6. Equity amounts are stored as percentages (DECIMAL 5,2)
-- 7. "current_role" is quoted because it's a reserved keyword
-- =====================================================
