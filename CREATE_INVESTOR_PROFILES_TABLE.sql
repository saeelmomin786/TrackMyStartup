-- Create investor_profiles table for storing detailed investor information
-- This table stores investor profile data similar to how startups have profiles

CREATE TABLE IF NOT EXISTS public.investor_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Basic Information
    firm_type TEXT,
    global_hq TEXT,
    investor_name TEXT NOT NULL,
    website TEXT,
    linkedin_link TEXT,
    email TEXT,
    
    -- Investment Preferences
    geography TEXT[], -- Array of countries/regions where they invest
    ticket_size_min DECIMAL(15,2), -- Minimum investment amount
    ticket_size_max DECIMAL(15,2), -- Maximum investment amount
    currency VARCHAR(10) DEFAULT 'USD', -- Currency for ticket sizes (USD, EUR, INR, etc.)
    investment_stages TEXT[], -- Array of stages (Pre-Seed, Seed, Series A, etc.)
    investment_thesis TEXT, -- Description of investment thesis
    
    -- Funding Requirements
    funding_requirements TEXT, -- Description of funding requirements
    funding_stages TEXT[], -- Array of funding stages
    target_countries TEXT[], -- Array of target countries
    company_size TEXT, -- Company size preference (e.g., "1-10", "11-50", etc.)
    
    -- Media
    logo_url TEXT,
    video_url TEXT, -- YouTube video URL
    media_type TEXT CHECK (media_type IN ('logo', 'video')) DEFAULT 'logo',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_investor_profiles_user_id ON public.investor_profiles(user_id);

-- Create index on firm_type for filtering
CREATE INDEX IF NOT EXISTS idx_investor_profiles_firm_type ON public.investor_profiles(firm_type);

-- Create index on investment_stages for filtering (using GIN index for array)
CREATE INDEX IF NOT EXISTS idx_investor_profiles_investment_stages ON public.investor_profiles USING GIN(investment_stages);

-- Create index on geography for filtering (using GIN index for array)
CREATE INDEX IF NOT EXISTS idx_investor_profiles_geography ON public.investor_profiles USING GIN(geography);

-- Enable RLS (Row Level Security)
ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_profiles') THEN
        DROP POLICY IF EXISTS "Anyone can view investor profiles" ON public.investor_profiles;
        DROP POLICY IF EXISTS "Users can insert their own investor profile" ON public.investor_profiles;
        DROP POLICY IF EXISTS "Users can update their own investor profile" ON public.investor_profiles;
        DROP POLICY IF EXISTS "Users can delete their own investor profile" ON public.investor_profiles;
    END IF;
END $$;

-- Policy: Users can view all investor profiles (for discovery)
CREATE POLICY "Anyone can view investor profiles"
    ON public.investor_profiles
    FOR SELECT
    USING (true);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert their own investor profile"
    ON public.investor_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own investor profile"
    ON public.investor_profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own profile
CREATE POLICY "Users can delete their own investor profile"
    ON public.investor_profiles
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_investor_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_profiles') THEN
        DROP TRIGGER IF EXISTS update_investor_profiles_updated_at ON public.investor_profiles;
    END IF;
END $$;

CREATE TRIGGER update_investor_profiles_updated_at
    BEFORE UPDATE ON public.investor_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_investor_profiles_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.investor_profiles IS 'Stores detailed investor profile information including investment preferences, funding requirements, and media';
COMMENT ON COLUMN public.investor_profiles.user_id IS 'Reference to the user who owns this investor profile';
COMMENT ON COLUMN public.investor_profiles.firm_type IS 'Type of investment firm (VC, Angel Investor, Corporate VC, etc.)';
COMMENT ON COLUMN public.investor_profiles.geography IS 'Array of countries/regions where the investor is interested in investing';
COMMENT ON COLUMN public.investor_profiles.currency IS 'Currency code for ticket sizes (USD, EUR, INR, etc.)';
COMMENT ON COLUMN public.investor_profiles.investment_stages IS 'Array of investment stages the investor focuses on';
COMMENT ON COLUMN public.investor_profiles.media_type IS 'Type of media to display: logo or video';

