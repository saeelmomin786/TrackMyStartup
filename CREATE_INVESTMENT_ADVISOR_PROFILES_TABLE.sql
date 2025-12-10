-- Create investment_advisor_profiles table for storing detailed Investment Advisor information
-- This table stores Investment Advisor profile data similar to investor_profiles

CREATE TABLE IF NOT EXISTS public.investment_advisor_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Basic Information
    advisor_name TEXT NOT NULL,
    firm_name TEXT,
    global_hq TEXT,
    website TEXT,
    linkedin_link TEXT,
    email TEXT,
    
    -- Service Preferences
    geography TEXT[], -- Array of countries/regions where they operate
    service_types TEXT[], -- Array of service types (Investment Advisory, Due Diligence, etc.)
    investment_stages TEXT[], -- Array of stages (Pre-Seed, Seed, Series A, etc.)
    domain TEXT[], -- Array of domains/sectors they specialize in
    
    -- Service Details
    minimum_investment DECIMAL(15,2), -- Minimum investment amount they work with
    maximum_investment DECIMAL(15,2), -- Maximum investment amount they work with
    currency VARCHAR(10) DEFAULT 'USD', -- Currency for investment amounts (USD, EUR, INR, etc.)
    service_description TEXT, -- Description of services offered

    -- Management Metrics
    startups_under_management INTEGER DEFAULT 0,
    investors_under_management INTEGER DEFAULT 0,
    successful_fundraises_startups INTEGER DEFAULT 0,

    -- Verified (On-Platform) Metrics
    verified_startups_under_management INTEGER DEFAULT 0,
    verified_investors_under_management INTEGER DEFAULT 0,
    verified_successful_fundraises_startups INTEGER DEFAULT 0,
    
    -- Media
    logo_url TEXT,
    video_url TEXT, -- YouTube video URL
    media_type TEXT CHECK (media_type IN ('logo', 'video')) DEFAULT 'logo',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_investment_advisor_profiles_user_id ON public.investment_advisor_profiles(user_id);

-- Create index on firm_name for filtering
CREATE INDEX IF NOT EXISTS idx_investment_advisor_profiles_firm_name ON public.investment_advisor_profiles(firm_name);

-- Create index on investment_stages for filtering (using GIN index for array)
CREATE INDEX IF NOT EXISTS idx_investment_advisor_profiles_investment_stages ON public.investment_advisor_profiles USING GIN(investment_stages);

-- Create index on geography for filtering (using GIN index for array)
CREATE INDEX IF NOT EXISTS idx_investment_advisor_profiles_geography ON public.investment_advisor_profiles USING GIN(geography);

-- Create index on domain for filtering (using GIN index for array)
CREATE INDEX IF NOT EXISTS idx_investment_advisor_profiles_domain ON public.investment_advisor_profiles USING GIN(domain);

-- Enable RLS (Row Level Security)
ALTER TABLE public.investment_advisor_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investment_advisor_profiles') THEN
        DROP POLICY IF EXISTS "Anyone can view investment advisor profiles" ON public.investment_advisor_profiles;
        DROP POLICY IF EXISTS "Users can insert their own investment advisor profile" ON public.investment_advisor_profiles;
        DROP POLICY IF EXISTS "Users can update their own investment advisor profile" ON public.investment_advisor_profiles;
        DROP POLICY IF EXISTS "Users can delete their own investment advisor profile" ON public.investment_advisor_profiles;
    END IF;
END $$;

-- Policy: Users can view all investment advisor profiles (for discovery)
CREATE POLICY "Anyone can view investment advisor profiles"
    ON public.investment_advisor_profiles
    FOR SELECT
    USING (true);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert their own investment advisor profile"
    ON public.investment_advisor_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own investment advisor profile"
    ON public.investment_advisor_profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own profile
CREATE POLICY "Users can delete their own investment advisor profile"
    ON public.investment_advisor_profiles
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_investment_advisor_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investment_advisor_profiles') THEN
        DROP TRIGGER IF EXISTS update_investment_advisor_profiles_updated_at ON public.investment_advisor_profiles;
    END IF;
END $$;

CREATE TRIGGER update_investment_advisor_profiles_updated_at
    BEFORE UPDATE ON public.investment_advisor_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_investment_advisor_profiles_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.investment_advisor_profiles IS 'Stores detailed Investment Advisor profile information including service preferences, geography, and media';
COMMENT ON COLUMN public.investment_advisor_profiles.user_id IS 'Reference to the user who owns this Investment Advisor profile';
COMMENT ON COLUMN public.investment_advisor_profiles.firm_name IS 'Name of the Investment Advisor firm';
COMMENT ON COLUMN public.investment_advisor_profiles.geography IS 'Array of countries/regions where the Investment Advisor operates';
COMMENT ON COLUMN public.investment_advisor_profiles.currency IS 'Currency code for investment amounts (USD, EUR, INR, etc.)';
COMMENT ON COLUMN public.investment_advisor_profiles.investment_stages IS 'Array of investment stages the Investment Advisor focuses on';
COMMENT ON COLUMN public.investment_advisor_profiles.media_type IS 'Type of media to display: logo or video';


