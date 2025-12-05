-- Create mentor_profiles table for storing detailed mentor information
-- This table stores mentor profile data similar to investor_profiles

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
    current_role TEXT,
    previous_companies TEXT[], -- Array of previous companies
    
    -- Mentoring Approach
    mentoring_approach TEXT, -- Description of mentoring style/approach
    availability TEXT, -- e.g., "Full-time", "Part-time", "Advisory"
    preferred_engagement TEXT, -- e.g., "1-on-1", "Group Sessions", "Workshops"
    
    -- Media
    logo_url TEXT,
    video_url TEXT, -- YouTube video URL
    media_type TEXT CHECK (media_type IN ('logo', 'video')) DEFAULT 'logo',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_user_id ON public.mentor_profiles(user_id);

-- Create index on mentor_type for filtering
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_mentor_type ON public.mentor_profiles(mentor_type);

-- Create index on expertise_areas for filtering (using GIN index for array)
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_expertise_areas ON public.mentor_profiles USING GIN(expertise_areas);

-- Create index on sectors for filtering (using GIN index for array)
CREATE INDEX IF NOT EXISTS idx_mentor_profiles_sectors ON public.mentor_profiles USING GIN(sectors);

-- Enable RLS
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Mentors can view and edit their own profile
CREATE POLICY "Mentors can view their own profile" ON public.mentor_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Mentors can insert their own profile" ON public.mentor_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Mentors can update their own profile" ON public.mentor_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Mentors can delete their own profile" ON public.mentor_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Public can view mentor profiles (for discovery)
CREATE POLICY "Public can view mentor profiles" ON public.mentor_profiles
    FOR SELECT USING (true);



