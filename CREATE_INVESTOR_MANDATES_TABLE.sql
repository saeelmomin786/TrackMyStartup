-- =====================================================
-- INVESTOR MANDATES TABLE
-- =====================================================
-- This table stores investor mandates (investment criteria filters)
-- Each investor can create multiple mandates with different criteria

CREATE TABLE IF NOT EXISTS public.investor_mandates (
    id SERIAL PRIMARY KEY,
    investor_id VARCHAR(255) NOT NULL, -- User ID of the investor
    name VARCHAR(255) NOT NULL, -- Name of the mandate (e.g., "Early Stage SaaS", "Healthcare Series A")
    stage VARCHAR(100), -- Startup stage filter
    round_type VARCHAR(100), -- Investment round type filter
    domain VARCHAR(100), -- Domain/sector filter
    amount_min DECIMAL(15,2), -- Minimum investment amount
    amount_max DECIMAL(15,2), -- Maximum investment amount
    equity_min DECIMAL(5,2), -- Minimum equity percentage
    equity_max DECIMAL(5,2), -- Maximum equity percentage
    is_active BOOLEAN DEFAULT true, -- Whether this mandate is active
    display_order INTEGER DEFAULT 0, -- Order for displaying mandates
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique mandate names per investor
    UNIQUE(investor_id, name)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_investor_mandates_investor_id ON public.investor_mandates(investor_id);
CREATE INDEX IF NOT EXISTS idx_investor_mandates_active ON public.investor_mandates(investor_id, is_active);

-- Enable Row Level Security
ALTER TABLE public.investor_mandates ENABLE ROW LEVEL SECURITY;

-- Policy: Allow investors to read their own mandates
CREATE POLICY "Investors can read their own mandates" 
    ON public.investor_mandates
    FOR SELECT
    USING (
        investor_id = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND (users.role = 'Admin' OR users.role = 'Investment Advisor')
        )
    );

-- Policy: Allow investors to insert their own mandates
CREATE POLICY "Investors can insert their own mandates" 
    ON public.investor_mandates
    FOR INSERT
    WITH CHECK (
        investor_id = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Admin'
        )
    );

-- Policy: Allow investors to update their own mandates
CREATE POLICY "Investors can update their own mandates" 
    ON public.investor_mandates
    FOR UPDATE
    USING (
        investor_id = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id::text = auth.uid()::text 
            AND users.role = 'Admin'
        )
    );

-- Policy: Allow investors to delete their own mandates
CREATE POLICY "Investors can delete their own mandates" 
    ON public.investor_mandates
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
CREATE OR REPLACE FUNCTION update_investor_mandates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_investor_mandates_updated_at
    BEFORE UPDATE ON public.investor_mandates
    FOR EACH ROW
    EXECUTE FUNCTION update_investor_mandates_updated_at();

-- Add comments
COMMENT ON TABLE public.investor_mandates IS 'Stores investor mandates (investment criteria filters)';
COMMENT ON COLUMN public.investor_mandates.name IS 'Name of the mandate (e.g., "Early Stage SaaS", "Healthcare Series A")';
COMMENT ON COLUMN public.investor_mandates.stage IS 'Startup stage filter (from general_data table)';
COMMENT ON COLUMN public.investor_mandates.round_type IS 'Investment round type filter (from general_data table)';
COMMENT ON COLUMN public.investor_mandates.domain IS 'Domain/sector filter (from general_data table)';
COMMENT ON COLUMN public.investor_mandates.amount_min IS 'Minimum investment amount in USD';
COMMENT ON COLUMN public.investor_mandates.amount_max IS 'Maximum investment amount in USD';
COMMENT ON COLUMN public.investor_mandates.equity_min IS 'Minimum equity percentage';
COMMENT ON COLUMN public.investor_mandates.equity_max IS 'Maximum equity percentage';


