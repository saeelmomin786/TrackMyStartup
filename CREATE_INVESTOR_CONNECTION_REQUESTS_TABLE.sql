-- =====================================================
-- INVESTOR CONNECTION REQUESTS TABLE
-- =====================================================
-- This table stores connection/pitch requests from startups and investor advisors to investors
-- When a startup clicks "Pitch" or an investor advisor clicks "Connect", a request is created

CREATE TABLE IF NOT EXISTS public.investor_connection_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requester_type TEXT NOT NULL CHECK (requester_type IN ('Startup', 'Investment Advisor')),
    
    -- For Startup requests
    startup_id INTEGER REFERENCES public.startups(id) ON DELETE CASCADE,
    startup_profile_url TEXT, -- Shareable URL to startup profile
    
    -- For Investment Advisor requests
    advisor_profile_url TEXT, -- Shareable URL to advisor profile (if applicable)
    
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
CREATE INDEX IF NOT EXISTS idx_investor_connection_requests_investor_id 
ON public.investor_connection_requests(investor_id);

CREATE INDEX IF NOT EXISTS idx_investor_connection_requests_requester_id 
ON public.investor_connection_requests(requester_id);

CREATE INDEX IF NOT EXISTS idx_investor_connection_requests_startup_id 
ON public.investor_connection_requests(startup_id);

CREATE INDEX IF NOT EXISTS idx_investor_connection_requests_status 
ON public.investor_connection_requests(status);

CREATE INDEX IF NOT EXISTS idx_investor_connection_requests_created_at 
ON public.investor_connection_requests(created_at DESC);

-- Create partial unique index to prevent duplicate pending startup requests
CREATE UNIQUE INDEX IF NOT EXISTS idx_investor_connection_requests_unique_pending_startup
ON public.investor_connection_requests(investor_id, requester_id, startup_id)
WHERE status = 'pending' AND requester_type = 'Startup';

-- Enable RLS
ALTER TABLE public.investor_connection_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Investors can view their own connection requests
CREATE POLICY "Investors can view their own connection requests" ON public.investor_connection_requests
    FOR SELECT USING (auth.uid() = investor_id);

-- Requesters can view their own sent requests
CREATE POLICY "Requesters can view their own sent requests" ON public.investor_connection_requests
    FOR SELECT USING (auth.uid() = requester_id);

-- Anyone authenticated can insert requests
CREATE POLICY "Authenticated users can create connection requests" ON public.investor_connection_requests
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Investors can update their own requests (accept/reject)
CREATE POLICY "Investors can update their own connection requests" ON public.investor_connection_requests
    FOR UPDATE USING (auth.uid() = investor_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_investor_connection_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_investor_connection_requests_updated_at
    BEFORE UPDATE ON public.investor_connection_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_investor_connection_requests_updated_at();

