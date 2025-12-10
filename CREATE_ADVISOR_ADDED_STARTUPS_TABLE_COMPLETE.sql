-- =====================================================
-- ADVISOR ADDED STARTUPS TABLE - COMPLETE SETUP
-- =====================================================
-- This script creates the advisor_added_startups table with all columns
-- This table stores startups that Investment Advisors manually add to their list
-- These startups are NOT on TMS (Track My Startup) platform

CREATE TABLE IF NOT EXISTS public.advisor_added_startups (
    id SERIAL PRIMARY KEY,
    advisor_id VARCHAR(255) NOT NULL, -- User ID of the Investment Advisor
    startup_name VARCHAR(255) NOT NULL, -- Name of the startup
    sector TEXT, -- Sector/domain of the startup
    website_url TEXT, -- Startup website
    linkedin_url TEXT, -- Startup LinkedIn
    contact_email TEXT NOT NULL, -- Contact email (required)
    contact_name TEXT NOT NULL, -- Contact person name (required)
    contact_number TEXT, -- Contact phone number
    description TEXT, -- Description of the startup
    current_valuation DECIMAL(15,2), -- Current valuation if known
    investment_amount DECIMAL(15,2), -- Amount invested by this advisor/client
    equity_percentage DECIMAL(5,2), -- Equity percentage owned
    investment_date DATE, -- Date of investment
    currency VARCHAR(10) DEFAULT 'USD', -- Currency for amounts
    domain TEXT, -- Domain/Sector (from general_data)
    stage TEXT, -- Stage (from general_data)
    round_type TEXT, -- Round type (from general_data)
    country TEXT, -- Country (from general_data)
    is_on_tms BOOLEAN DEFAULT false, -- Whether startup has joined TMS
    tms_startup_id INTEGER, -- Reference to startups table if they join TMS
    invite_sent_at TIMESTAMP WITH TIME ZONE, -- When invite was sent
    invite_status VARCHAR(50) DEFAULT 'not_sent', -- 'not_sent', 'sent', 'accepted', 'declined'
    notes TEXT, -- Additional notes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique startup name per advisor (to avoid duplicates)
    UNIQUE(advisor_id, startup_name)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_advisor_added_startups_advisor_id ON public.advisor_added_startups(advisor_id);
CREATE INDEX IF NOT EXISTS idx_advisor_added_startups_tms_startup_id ON public.advisor_added_startups(tms_startup_id);
CREATE INDEX IF NOT EXISTS idx_advisor_added_startups_invite_status ON public.advisor_added_startups(advisor_id, invite_status);

-- Enable Row Level Security
ALTER TABLE public.advisor_added_startups ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Advisors can read their own added startups" ON public.advisor_added_startups;
DROP POLICY IF EXISTS "Advisors can insert their own added startups" ON public.advisor_added_startups;
DROP POLICY IF EXISTS "Advisors can update their own added startups" ON public.advisor_added_startups;
DROP POLICY IF EXISTS "Advisors can delete their own added startups" ON public.advisor_added_startups;

-- Policy: Allow advisors to read their own added startups
CREATE POLICY "Advisors can read their own added startups" 
    ON public.advisor_added_startups
    FOR SELECT
    USING (
        advisor_id = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Admin'
        )
    );

-- Policy: Allow advisors to insert their own added startups
CREATE POLICY "Advisors can insert their own added startups" 
    ON public.advisor_added_startups
    FOR INSERT
    WITH CHECK (
        advisor_id = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Admin'
        )
    );

-- Policy: Allow advisors to update their own added startups
CREATE POLICY "Advisors can update their own added startups" 
    ON public.advisor_added_startups
    FOR UPDATE
    USING (
        advisor_id = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Admin'
        )
    );

-- Policy: Allow advisors to delete their own added startups
CREATE POLICY "Advisors can delete their own added startups" 
    ON public.advisor_added_startups
    FOR DELETE
    USING (
        advisor_id = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Admin'
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_advisor_added_startups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_advisor_added_startups_updated_at ON public.advisor_added_startups;
CREATE TRIGGER update_advisor_added_startups_updated_at
    BEFORE UPDATE ON public.advisor_added_startups
    FOR EACH ROW
    EXECUTE FUNCTION update_advisor_added_startups_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.advisor_added_startups IS 'Stores startups manually added by Investment Advisors who are not on TMS platform';
COMMENT ON COLUMN public.advisor_added_startups.advisor_id IS 'User ID of the Investment Advisor who added this startup';
COMMENT ON COLUMN public.advisor_added_startups.is_on_tms IS 'Whether the startup has joined TMS platform';
COMMENT ON COLUMN public.advisor_added_startups.tms_startup_id IS 'Reference to startups table if startup joins TMS';
COMMENT ON COLUMN public.advisor_added_startups.domain IS 'Domain/Sector from general_data table';
COMMENT ON COLUMN public.advisor_added_startups.stage IS 'Stage from general_data table';
COMMENT ON COLUMN public.advisor_added_startups.round_type IS 'Round type from general_data table';


