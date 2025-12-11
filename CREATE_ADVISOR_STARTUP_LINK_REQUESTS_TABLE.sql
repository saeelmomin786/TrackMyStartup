-- =====================================================
-- ADVISOR STARTUP LINK REQUESTS TABLE
-- =====================================================
-- This table stores permission requests from Investment Advisors
-- to link existing TMS startups to their account
-- Startups must approve these requests before linking

CREATE TABLE IF NOT EXISTS public.advisor_startup_link_requests (
    id SERIAL PRIMARY KEY,
    advisor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    advisor_code VARCHAR(50) NOT NULL,
    advisor_name TEXT,
    advisor_email TEXT,
    startup_id INTEGER NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    startup_name TEXT NOT NULL,
    startup_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    startup_email TEXT NOT NULL,
    advisor_added_startup_id INTEGER REFERENCES public.advisor_added_startups(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    message TEXT, -- Optional message from advisor
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_advisor_startup_link_requests_advisor_id 
ON public.advisor_startup_link_requests(advisor_id);

CREATE INDEX IF NOT EXISTS idx_advisor_startup_link_requests_startup_id 
ON public.advisor_startup_link_requests(startup_id);

CREATE INDEX IF NOT EXISTS idx_advisor_startup_link_requests_startup_user_id 
ON public.advisor_startup_link_requests(startup_user_id);

CREATE INDEX IF NOT EXISTS idx_advisor_startup_link_requests_status 
ON public.advisor_startup_link_requests(status);

CREATE INDEX IF NOT EXISTS idx_advisor_startup_link_requests_advisor_code 
ON public.advisor_startup_link_requests(advisor_code);

-- Enable Row Level Security
ALTER TABLE public.advisor_startup_link_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Advisors can view their own link requests" ON public.advisor_startup_link_requests;
DROP POLICY IF EXISTS "Startups can view requests for their startups" ON public.advisor_startup_link_requests;
DROP POLICY IF EXISTS "Advisors can create link requests" ON public.advisor_startup_link_requests;
DROP POLICY IF EXISTS "Startups can update requests for their startups" ON public.advisor_startup_link_requests;

-- RLS Policies
CREATE POLICY "Advisors can view their own link requests" 
    ON public.advisor_startup_link_requests
    FOR SELECT
    USING (auth.uid() = advisor_id);

CREATE POLICY "Startups can view requests for their startups" 
    ON public.advisor_startup_link_requests
    FOR SELECT
    USING (auth.uid() = startup_user_id);

CREATE POLICY "Advisors can create link requests" 
    ON public.advisor_startup_link_requests
    FOR INSERT
    WITH CHECK (auth.uid() = advisor_id);

CREATE POLICY "Startups can update requests for their startups" 
    ON public.advisor_startup_link_requests
    FOR UPDATE
    USING (auth.uid() = startup_user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_advisor_startup_link_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_advisor_startup_link_requests_updated_at ON public.advisor_startup_link_requests;
CREATE TRIGGER update_advisor_startup_link_requests_updated_at
    BEFORE UPDATE ON public.advisor_startup_link_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_advisor_startup_link_requests_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.advisor_startup_link_requests IS 'Stores permission requests from Investment Advisors to link existing TMS startups';
COMMENT ON COLUMN public.advisor_startup_link_requests.advisor_id IS 'User ID of the Investment Advisor requesting the link';
COMMENT ON COLUMN public.advisor_startup_link_requests.startup_id IS 'ID of the startup being requested';
COMMENT ON COLUMN public.advisor_startup_link_requests.status IS 'Request status: pending, approved, or rejected';
COMMENT ON COLUMN public.advisor_startup_link_requests.advisor_added_startup_id IS 'Reference to advisor_added_startups table if request came from manual addition';

