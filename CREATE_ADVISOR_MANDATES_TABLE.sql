-- =====================================================
-- ADVISOR MANDATES TABLE
-- =====================================================
-- This table stores investment advisor mandates (investment criteria filters)
-- Each advisor can create multiple mandates with different criteria

CREATE TABLE IF NOT EXISTS public.advisor_mandates (
    id SERIAL PRIMARY KEY,
    advisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
    
    -- Ensure unique mandate names per advisor
    UNIQUE(advisor_id, name)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_advisor_mandates_advisor_id ON public.advisor_mandates(advisor_id);
CREATE INDEX IF NOT EXISTS idx_advisor_mandates_active ON public.advisor_mandates(advisor_id, is_active);

-- Enable Row Level Security
ALTER TABLE public.advisor_mandates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'advisor_mandates') THEN
        DROP POLICY IF EXISTS "Advisors can read their own mandates" ON public.advisor_mandates;
        DROP POLICY IF EXISTS "Advisors can insert their own mandates" ON public.advisor_mandates;
        DROP POLICY IF EXISTS "Advisors can update their own mandates" ON public.advisor_mandates;
        DROP POLICY IF EXISTS "Advisors can delete their own mandates" ON public.advisor_mandates;
    END IF;
END $$;

-- Policy: Allow advisors to read their own mandates
CREATE POLICY "Advisors can read their own mandates" 
    ON public.advisor_mandates
    FOR SELECT
    USING (
        advisor_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Admin'
        )
    );

-- Policy: Allow advisors to insert their own mandates
CREATE POLICY "Advisors can insert their own mandates" 
    ON public.advisor_mandates
    FOR INSERT
    WITH CHECK (
        advisor_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Admin'
        )
    );

-- Policy: Allow advisors to update their own mandates
CREATE POLICY "Advisors can update their own mandates" 
    ON public.advisor_mandates
    FOR UPDATE
    USING (
        advisor_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Admin'
        )
    );

-- Policy: Allow advisors to delete their own mandates
CREATE POLICY "Advisors can delete their own mandates" 
    ON public.advisor_mandates
    FOR DELETE
    USING (
        advisor_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Admin'
        )
    );

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_advisor_mandates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'advisor_mandates') THEN
        DROP TRIGGER IF EXISTS update_advisor_mandates_updated_at ON public.advisor_mandates;
    END IF;
END $$;

CREATE TRIGGER update_advisor_mandates_updated_at
    BEFORE UPDATE ON public.advisor_mandates
    FOR EACH ROW
    EXECUTE FUNCTION update_advisor_mandates_updated_at();

-- Add comments
COMMENT ON TABLE public.advisor_mandates IS 'Stores investment advisor mandates (investment criteria filters)';
COMMENT ON COLUMN public.advisor_mandates.name IS 'Name of the mandate (e.g., "Early Stage SaaS", "Healthcare Series A")';
COMMENT ON COLUMN public.advisor_mandates.stage IS 'Startup stage filter (from general_data table)';
COMMENT ON COLUMN public.advisor_mandates.round_type IS 'Investment round type filter (from general_data table)';
COMMENT ON COLUMN public.advisor_mandates.domain IS 'Domain/sector filter (from general_data table)';
COMMENT ON COLUMN public.advisor_mandates.amount_min IS 'Minimum investment amount';
COMMENT ON COLUMN public.advisor_mandates.amount_max IS 'Maximum investment amount';
COMMENT ON COLUMN public.advisor_mandates.equity_min IS 'Minimum equity percentage';
COMMENT ON COLUMN public.advisor_mandates.equity_max IS 'Maximum equity percentage';




