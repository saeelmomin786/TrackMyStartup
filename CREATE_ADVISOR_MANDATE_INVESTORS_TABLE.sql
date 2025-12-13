-- =====================================================
-- ADVISOR MANDATE INVESTORS JUNCTION TABLE
-- =====================================================
-- This table creates a many-to-many relationship between advisor_mandates and investors
-- Each mandate can have multiple investors, and each investor can be in multiple mandates
-- This allows Investment Advisors to group investors by mandate for easy group recommendations

CREATE TABLE IF NOT EXISTS public.advisor_mandate_investors (
    id SERIAL PRIMARY KEY,
    mandate_id INTEGER NOT NULL REFERENCES public.advisor_mandates(id) ON DELETE CASCADE,
    investor_id VARCHAR(255) NOT NULL, -- User ID of the investor (from users table)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique combination of mandate and investor (prevent duplicates)
    UNIQUE(mandate_id, investor_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_advisor_mandate_investors_mandate_id ON public.advisor_mandate_investors(mandate_id);
CREATE INDEX IF NOT EXISTS idx_advisor_mandate_investors_investor_id ON public.advisor_mandate_investors(investor_id);
CREATE INDEX IF NOT EXISTS idx_advisor_mandate_investors_composite ON public.advisor_mandate_investors(mandate_id, investor_id);

-- Enable Row Level Security
ALTER TABLE public.advisor_mandate_investors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'advisor_mandate_investors' AND policyname = 'Advisors can manage their own mandate investors') THEN
        DROP POLICY "Advisors can manage their own mandate investors" ON public.advisor_mandate_investors;
    END IF;
END $$;

-- Policy: Allow advisors to read/manage investors for their own mandates
CREATE POLICY "Advisors can manage their own mandate investors"
    ON public.advisor_mandate_investors
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.advisor_mandates
            WHERE advisor_mandates.id = advisor_mandate_investors.mandate_id
            AND COALESCE(advisor_mandates.advisor_id::text, '') = COALESCE(auth.uid()::text, '')
        )
    );

-- Add comment to table
COMMENT ON TABLE public.advisor_mandate_investors IS 'Junction table linking advisor mandates to investors for group recommendations';

-- Add comments to columns
COMMENT ON COLUMN public.advisor_mandate_investors.mandate_id IS 'Reference to the advisor_mandates table';
COMMENT ON COLUMN public.advisor_mandate_investors.investor_id IS 'User ID of the investor (from users table)';

