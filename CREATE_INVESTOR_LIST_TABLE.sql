-- =====================================================
-- ADMIN UPLOADED INVESTOR LIST TABLE
-- =====================================================
-- This table stores investors that admins upload/manage
-- These investors are displayed in the startup dashboard under Fundraising > Investor List
-- Fields: Name, Fund Type, Website, Domain, Stage, Country, LinkedIn, Image URL

CREATE TABLE IF NOT EXISTS public.investor_list (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL, -- Investor/VC Firm Name
    fund_type VARCHAR(100), -- Type of fund (VC, Angel, Corporate, etc.)
    website TEXT, -- Investor website URL
    domain TEXT, -- Domain/Sector they invest in
    stage TEXT, -- Investment stage (Pre-Seed, Seed, Series A, etc.)
    country TEXT, -- Country/Region
    linkedin TEXT, -- LinkedIn URL
    image_url TEXT, -- Investor logo/image URL
    is_active BOOLEAN DEFAULT true, -- Whether this investor is active/visible
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255), -- User ID who created this record
    updated_by VARCHAR(255) -- User ID who last updated this record
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_investor_list_name ON public.investor_list(name);
CREATE INDEX IF NOT EXISTS idx_investor_list_fund_type ON public.investor_list(fund_type);
CREATE INDEX IF NOT EXISTS idx_investor_list_domain ON public.investor_list(domain);
CREATE INDEX IF NOT EXISTS idx_investor_list_stage ON public.investor_list(stage);
CREATE INDEX IF NOT EXISTS idx_investor_list_country ON public.investor_list(country);
CREATE INDEX IF NOT EXISTS idx_investor_list_active ON public.investor_list(is_active);
CREATE INDEX IF NOT EXISTS idx_investor_list_created_at ON public.investor_list(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.investor_list ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read active investors
CREATE POLICY "Allow read access to active investor list" 
    ON public.investor_list
    FOR SELECT
    USING (is_active = true);

-- Policy: Allow admins to read all investors (including inactive)
CREATE POLICY "Allow admins to read all investor list" 
    ON public.investor_list
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Admin'
        )
    );

-- Policy: Allow admins to insert
CREATE POLICY "Allow admins to insert investor list" 
    ON public.investor_list
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Admin'
        )
    );

-- Policy: Allow admins to update
CREATE POLICY "Allow admins to update investor list" 
    ON public.investor_list
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Admin'
        )
    );

-- Policy: Allow admins to delete
CREATE POLICY "Allow admins to delete investor list" 
    ON public.investor_list
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Admin'
        )
    );

-- Add comments
COMMENT ON TABLE public.investor_list IS 'Admin-uploaded investor list displayed in startup dashboard';
COMMENT ON COLUMN public.investor_list.name IS 'Investor/VC Firm Name';
COMMENT ON COLUMN public.investor_list.fund_type IS 'Type of fund (VC, Angel, Corporate, etc.)';
COMMENT ON COLUMN public.investor_list.domain IS 'Domain/Sector they invest in';
COMMENT ON COLUMN public.investor_list.stage IS 'Investment stage (Pre-Seed, Seed, Series A, etc.)';
COMMENT ON COLUMN public.investor_list.is_active IS 'Whether this investor is active and visible to startups';

