-- =====================================================
-- ADVISOR ADDED INVESTORS TABLE - COMPLETE SETUP
-- =====================================================
-- This script creates the advisor_added_investors table with all columns
-- including domain and stage columns
-- This table stores investors that Investment Advisors manually add to their list
-- These investors are NOT on TMS (Track My Startup) platform

CREATE TABLE IF NOT EXISTS public.advisor_added_investors (
    id SERIAL PRIMARY KEY,
    advisor_id VARCHAR(255) NOT NULL, -- User ID of the Investment Advisor
    investor_name VARCHAR(255) NOT NULL, -- Name/VC Firm name
    email TEXT NOT NULL, -- Contact email (required)
    contact_number TEXT, -- Contact phone number
    website TEXT, -- Investor website
    linkedin_url TEXT, -- LinkedIn URL
    firm_type VARCHAR(100), -- Type of firm (VC, Angel Investor, etc.)
    location TEXT, -- Location/Headquarters (Country)
    investment_focus TEXT, -- Investment focus (round_type from general_data)
    domain TEXT, -- Domain/Sector (from general_data)
    stage TEXT, -- Stage (from general_data)
    notes TEXT, -- Additional notes
    is_on_tms BOOLEAN DEFAULT false, -- Whether investor has joined TMS
    tms_investor_id VARCHAR(255), -- Reference to users table if they join TMS
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique investor name per advisor (to avoid duplicates)
    UNIQUE(advisor_id, investor_name)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_advisor_added_investors_advisor_id ON public.advisor_added_investors(advisor_id);
CREATE INDEX IF NOT EXISTS idx_advisor_added_investors_tms_investor_id ON public.advisor_added_investors(tms_investor_id);
CREATE INDEX IF NOT EXISTS idx_advisor_added_investors_email ON public.advisor_added_investors(advisor_id, email);

-- Enable Row Level Security
ALTER TABLE public.advisor_added_investors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Advisors can read their own added investors" ON public.advisor_added_investors;
DROP POLICY IF EXISTS "Advisors can insert their own added investors" ON public.advisor_added_investors;
DROP POLICY IF EXISTS "Advisors can update their own added investors" ON public.advisor_added_investors;
DROP POLICY IF EXISTS "Advisors can delete their own added investors" ON public.advisor_added_investors;

-- Policy: Allow advisors to read their own added investors
CREATE POLICY "Advisors can read their own added investors" 
    ON public.advisor_added_investors
    FOR SELECT
    USING (
        advisor_id = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Admin'
        )
    );

-- Policy: Allow advisors to insert their own added investors
CREATE POLICY "Advisors can insert their own added investors" 
    ON public.advisor_added_investors
    FOR INSERT
    WITH CHECK (
        advisor_id = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Admin'
        )
    );

-- Policy: Allow advisors to update their own added investors
CREATE POLICY "Advisors can update their own added investors" 
    ON public.advisor_added_investors
    FOR UPDATE
    USING (
        advisor_id = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Admin'
        )
    );

-- Policy: Allow advisors to delete their own added investors
CREATE POLICY "Advisors can delete their own added investors" 
    ON public.advisor_added_investors
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
CREATE OR REPLACE FUNCTION update_advisor_added_investors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_advisor_added_investors_updated_at ON public.advisor_added_investors;
CREATE TRIGGER update_advisor_added_investors_updated_at
    BEFORE UPDATE ON public.advisor_added_investors
    FOR EACH ROW
    EXECUTE FUNCTION update_advisor_added_investors_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.advisor_added_investors IS 'Stores investors manually added by Investment Advisors who are not on TMS platform';
COMMENT ON COLUMN public.advisor_added_investors.advisor_id IS 'User ID of the Investment Advisor who added this investor';
COMMENT ON COLUMN public.advisor_added_investors.is_on_tms IS 'Whether the investor has joined TMS platform';
COMMENT ON COLUMN public.advisor_added_investors.tms_investor_id IS 'Reference to users table if investor joins TMS';
COMMENT ON COLUMN public.advisor_added_investors.domain IS 'Domain/Sector from general_data table';
COMMENT ON COLUMN public.advisor_added_investors.stage IS 'Stage from general_data table';




