-- =====================================================
-- INVESTOR ADDED STARTUPS TABLE
-- =====================================================
-- This table stores startups that investors manually add to their portfolio
-- These startups are NOT on TMS (Track My Startup) platform
-- Investors can invite these startups to join TMS

CREATE TABLE IF NOT EXISTS public.investor_added_startups (
    id SERIAL PRIMARY KEY,
    investor_id VARCHAR(255) NOT NULL, -- User ID of the investor
    startup_name VARCHAR(255) NOT NULL, -- Name of the startup
    sector VARCHAR(100), -- Sector/domain of the startup
    website_url TEXT, -- Startup website
    linkedin_url TEXT, -- Startup LinkedIn
    contact_email TEXT NOT NULL, -- Contact email (required)
    contact_name TEXT NOT NULL, -- Contact person name (required)
    contact_number TEXT, -- Contact phone number
    description TEXT, -- Description of the startup
    current_valuation DECIMAL(15,2), -- Current valuation if known
    investment_amount DECIMAL(15,2), -- Amount invested by this investor
    equity_percentage DECIMAL(5,2), -- Equity percentage owned
    investment_date DATE, -- Date of investment
    currency VARCHAR(10) DEFAULT 'USD', -- Currency for amounts
    is_on_tms BOOLEAN DEFAULT false, -- Whether startup has joined TMS
    tms_startup_id INTEGER, -- Reference to startups table if they join TMS
    invite_sent_at TIMESTAMP WITH TIME ZONE, -- When invite was sent
    invite_status VARCHAR(50) DEFAULT 'not_sent', -- 'not_sent', 'sent', 'accepted', 'declined'
    notes TEXT, -- Additional notes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique startup name per investor (to avoid duplicates)
    UNIQUE(investor_id, startup_name)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_investor_added_startups_investor_id ON public.investor_added_startups(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_added_startups_tms_startup_id ON public.investor_added_startups(tms_startup_id);
CREATE INDEX IF NOT EXISTS idx_investor_added_startups_invite_status ON public.investor_added_startups(investor_id, invite_status);

-- Enable Row Level Security
ALTER TABLE public.investor_added_startups ENABLE ROW LEVEL SECURITY;

-- Policy: Allow investors to read their own added startups
DROP POLICY IF EXISTS "Investors can read their own added startups" ON public.investor_added_startups;
CREATE POLICY "Investors can read their own added startups" 
    ON public.investor_added_startups
    FOR SELECT
    USING (
        investor_id = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND (users.role = 'Admin' OR users.role = 'Investment Advisor')
        )
    );

-- Policy: Allow investors to insert their own added startups
DROP POLICY IF EXISTS "Investors can insert their own added startups" ON public.investor_added_startups;
CREATE POLICY "Investors can insert their own added startups" 
    ON public.investor_added_startups
    FOR INSERT
    WITH CHECK (
        investor_id = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Admin'
        )
    );

-- Policy: Allow investors to update their own added startups
DROP POLICY IF EXISTS "Investors can update their own added startups" ON public.investor_added_startups;
CREATE POLICY "Investors can update their own added startups" 
    ON public.investor_added_startups
    FOR UPDATE
    USING (
        investor_id = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Admin'
        )
    );

-- Policy: Allow investors to delete their own added startups
DROP POLICY IF EXISTS "Investors can delete their own added startups" ON public.investor_added_startups;
CREATE POLICY "Investors can delete their own added startups" 
    ON public.investor_added_startups
    FOR DELETE
    USING (
        investor_id = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Admin'
        )
    );

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_investor_added_startups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_investor_added_startups_updated_at ON public.investor_added_startups;
CREATE TRIGGER update_investor_added_startups_updated_at
    BEFORE UPDATE ON public.investor_added_startups
    FOR EACH ROW
    EXECUTE FUNCTION update_investor_added_startups_updated_at();

-- Add comments
COMMENT ON TABLE public.investor_added_startups IS 'Stores startups manually added by investors that are not on TMS platform';
COMMENT ON COLUMN public.investor_added_startups.is_on_tms IS 'Whether the startup has joined TMS platform';
COMMENT ON COLUMN public.investor_added_startups.tms_startup_id IS 'Reference to startups table if startup joins TMS';
COMMENT ON COLUMN public.investor_added_startups.invite_status IS 'Status of TMS invite: not_sent, sent, accepted, declined';

