-- =====================================================
-- COMPLETE SETUP: CREATE AND UPDATE INVESTOR CONNECTION REQUESTS TABLE
-- =====================================================
-- PURPOSE: This script creates the table if it doesn't exist, then updates it
--          to support all collaborator types (Mentor, CA, CS, Incubator, etc.)
--
-- USAGE: Run this complete script - it handles both creation and update
--        Safe to run multiple times (idempotent)

-- Step 1: Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.investor_connection_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requester_type TEXT NOT NULL, -- Will be updated with constraint below
    
    -- For Startup requests
    startup_id INTEGER REFERENCES public.startups(id) ON DELETE CASCADE,
    startup_profile_url TEXT, -- Shareable URL to startup profile
    
    -- For Investment Advisor and other collaborator requests
    advisor_profile_url TEXT, -- Shareable URL to advisor/collaborator profile (if applicable)
    
    -- Request details
    message TEXT, -- Optional message from requester
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'viewed')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    viewed_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE
);

-- Step 2: Drop old constraint if it exists (only allows 'Startup' and 'Investment Advisor')
ALTER TABLE public.investor_connection_requests 
DROP CONSTRAINT IF EXISTS investor_connection_requests_requester_type_check;

-- Step 3: Add new constraint that allows all collaborator types
-- This allows: Startup, Investment Advisor, Mentor, CA, CS, Incubator, and any future types
ALTER TABLE public.investor_connection_requests 
ADD CONSTRAINT investor_connection_requests_requester_type_check 
CHECK (requester_type IS NOT NULL AND requester_type != '');

-- Step 4: Add generic profile_url field for any collaborator type (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'investor_connection_requests' 
        AND column_name = 'profile_url'
    ) THEN
        ALTER TABLE public.investor_connection_requests 
        ADD COLUMN profile_url TEXT;
    END IF;
END $$;

-- Step 5: Create indexes for better query performance (if not exists)
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

-- Step 6: Enable Row Level Security (RLS)
ALTER TABLE public.investor_connection_requests ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies (drop and recreate to ensure they're correct)
DROP POLICY IF EXISTS "Investors can view their own connection requests" ON public.investor_connection_requests;
CREATE POLICY "Investors can view their own connection requests" ON public.investor_connection_requests
    FOR SELECT USING (auth.uid() = investor_id);

DROP POLICY IF EXISTS "Requesters can view their own sent requests" ON public.investor_connection_requests;
CREATE POLICY "Requesters can view their own sent requests" ON public.investor_connection_requests
    FOR SELECT USING (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Authenticated users can create connection requests" ON public.investor_connection_requests;
CREATE POLICY "Authenticated users can create connection requests" ON public.investor_connection_requests
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Investors can update their own connection requests" ON public.investor_connection_requests;
CREATE POLICY "Investors can update their own connection requests" ON public.investor_connection_requests
    FOR UPDATE USING (auth.uid() = investor_id);

-- Step 8: Create or replace function for auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_investor_connection_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create trigger for auto-update (drop and recreate)
DROP TRIGGER IF EXISTS update_investor_connection_requests_updated_at ON public.investor_connection_requests;
CREATE TRIGGER update_investor_connection_requests_updated_at
    BEFORE UPDATE ON public.investor_connection_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_investor_connection_requests_updated_at();

-- Step 10: Verify the setup
SELECT 
    'Table created/updated successfully!' as status,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'investor_connection_requests'
ORDER BY ordinal_position;

