-- =====================================================
-- ADVISOR CONNECTION REQUESTS TABLE
-- =====================================================
-- This table stores connection/pitch requests from startups and other collaborators to Investment Advisors
-- When a startup clicks "Pitch" → goes to Service Requests tab
-- When other roles (CA, CS, Mentor, Investor, Investment Advisor, Incubation) click "Connect" → goes to Collaboration tab

CREATE TABLE IF NOT EXISTS public.advisor_connection_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    advisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requester_type TEXT NOT NULL CHECK (requester_type IN ('Startup', 'Investor', 'Investment Advisor', 'Mentor', 'CA', 'CS', 'Incubation', 'Incubation Center', 'Incubator')),
    
    -- For Startup requests (Pitch)
    startup_id INTEGER REFERENCES public.startups(id) ON DELETE CASCADE,
    startup_profile_url TEXT, -- Shareable URL to startup profile
    
    -- For Collaborator requests (Connect)
    collaborator_profile_url TEXT, -- Shareable URL to collaborator profile (if applicable)
    
    -- Request details
    message TEXT, -- Optional message from requester
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'viewed')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    viewed_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_advisor_connection_requests_advisor_id 
ON public.advisor_connection_requests(advisor_id);

CREATE INDEX IF NOT EXISTS idx_advisor_connection_requests_requester_id 
ON public.advisor_connection_requests(requester_id);

CREATE INDEX IF NOT EXISTS idx_advisor_connection_requests_startup_id 
ON public.advisor_connection_requests(startup_id);

CREATE INDEX IF NOT EXISTS idx_advisor_connection_requests_status 
ON public.advisor_connection_requests(status);

CREATE INDEX IF NOT EXISTS idx_advisor_connection_requests_requester_type 
ON public.advisor_connection_requests(requester_type);

CREATE INDEX IF NOT EXISTS idx_advisor_connection_requests_created_at 
ON public.advisor_connection_requests(created_at DESC);

-- Update CHECK constraint if table already exists (to include Incubation and Incubation Center)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'advisor_connection_requests') THEN
        -- Drop existing constraint if it exists
        ALTER TABLE public.advisor_connection_requests 
        DROP CONSTRAINT IF EXISTS advisor_connection_requests_requester_type_check;
        
        -- Add updated constraint
        ALTER TABLE public.advisor_connection_requests 
        ADD CONSTRAINT advisor_connection_requests_requester_type_check 
        CHECK (requester_type IN ('Startup', 'Investor', 'Investment Advisor', 'Mentor', 'CA', 'CS', 'Incubation', 'Incubation Center', 'Incubator'));
    END IF;
END $$;

-- Enable RLS (Row Level Security)
ALTER TABLE public.advisor_connection_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'advisor_connection_requests') THEN
        DROP POLICY IF EXISTS "Advisors can view their own connection requests" ON public.advisor_connection_requests;
        DROP POLICY IF EXISTS "Requesters can view their own connection requests" ON public.advisor_connection_requests;
        DROP POLICY IF EXISTS "Users can create connection requests to advisors" ON public.advisor_connection_requests;
        DROP POLICY IF EXISTS "Advisors can update their own connection requests" ON public.advisor_connection_requests;
        DROP POLICY IF EXISTS "Advisors can delete their own connection requests" ON public.advisor_connection_requests;
    END IF;
END $$;

-- Policy: Advisors can view their own connection requests
CREATE POLICY "Advisors can view their own connection requests"
    ON public.advisor_connection_requests
    FOR SELECT
    USING (auth.uid() = advisor_id);

-- Policy: Requesters can view their own connection requests
CREATE POLICY "Requesters can view their own connection requests"
    ON public.advisor_connection_requests
    FOR SELECT
    USING (auth.uid() = requester_id);

-- Policy: Users can create connection requests to advisors
CREATE POLICY "Users can create connection requests to advisors"
    ON public.advisor_connection_requests
    FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

-- Policy: Advisors can update their own connection requests
CREATE POLICY "Advisors can update their own connection requests"
    ON public.advisor_connection_requests
    FOR UPDATE
    USING (auth.uid() = advisor_id)
    WITH CHECK (auth.uid() = advisor_id);

-- Policy: Advisors can delete their own connection requests
CREATE POLICY "Advisors can delete their own connection requests"
    ON public.advisor_connection_requests
    FOR DELETE
    USING (auth.uid() = advisor_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_advisor_connection_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'advisor_connection_requests') THEN
        DROP TRIGGER IF EXISTS update_advisor_connection_requests_updated_at ON public.advisor_connection_requests;
    END IF;
END $$;

CREATE TRIGGER update_advisor_connection_requests_updated_at
    BEFORE UPDATE ON public.advisor_connection_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_advisor_connection_requests_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.advisor_connection_requests IS 'Stores connection/pitch requests from startups and collaborators to Investment Advisors';
COMMENT ON COLUMN public.advisor_connection_requests.advisor_id IS 'Investment Advisor receiving the request';
COMMENT ON COLUMN public.advisor_connection_requests.requester_type IS 'Type of requester: Startup (Pitch) or Collaborator (Connect)';
COMMENT ON COLUMN public.advisor_connection_requests.status IS 'Request status: pending, accepted, rejected, viewed';

