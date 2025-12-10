-- =====================================================
-- QUICK SETUP: ALL COLLABORATION TABLES IN ONE SCRIPT
-- =====================================================
-- PURPOSE: Run this ONE script to set up everything for Collaboration tab
--          This creates/updates investor_connection_requests AND creates collaborator_recommendations
--
-- USAGE: Run this complete script - handles everything
--        Safe to run multiple times (idempotent)

-- =====================================================
-- PART 1: INVESTOR CONNECTION REQUESTS TABLE
-- =====================================================

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.investor_connection_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requester_type TEXT NOT NULL,
    
    -- For Startup requests
    startup_id INTEGER REFERENCES public.startups(id) ON DELETE CASCADE,
    startup_profile_url TEXT,
    
    -- For Investment Advisor and other collaborator requests
    advisor_profile_url TEXT,
    
    -- Request details
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'viewed')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    viewed_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE
);

-- Update constraint to allow all collaborator types
ALTER TABLE public.investor_connection_requests 
DROP CONSTRAINT IF EXISTS investor_connection_requests_requester_type_check;

ALTER TABLE public.investor_connection_requests 
ADD CONSTRAINT investor_connection_requests_requester_type_check 
CHECK (requester_type IS NOT NULL AND requester_type != '');

-- Add profile_url column if not exists
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

-- Create indexes
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

-- Create trigger function
CREATE OR REPLACE FUNCTION update_investor_connection_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_investor_connection_requests_updated_at ON public.investor_connection_requests;
CREATE TRIGGER update_investor_connection_requests_updated_at
    BEFORE UPDATE ON public.investor_connection_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_investor_connection_requests_updated_at();

-- =====================================================
-- PART 2: COLLABORATOR RECOMMENDATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.collaborator_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Who sent the recommendation (the investor)
    sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_name TEXT,
    
    -- Who receives the recommendation (the collaborator)
    collaborator_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Which startup is being recommended
    startup_id INTEGER NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    startup_name TEXT NOT NULL,
    
    -- Optional fields
    message TEXT,
    startup_profile_url TEXT,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'accepted', 'rejected')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_collaborator_recommendations_sender 
ON public.collaborator_recommendations(sender_user_id);

CREATE INDEX IF NOT EXISTS idx_collaborator_recommendations_collaborator 
ON public.collaborator_recommendations(collaborator_user_id);

CREATE INDEX IF NOT EXISTS idx_collaborator_recommendations_startup 
ON public.collaborator_recommendations(startup_id);

CREATE INDEX IF NOT EXISTS idx_collaborator_recommendations_status 
ON public.collaborator_recommendations(status);

CREATE INDEX IF NOT EXISTS idx_collaborator_recommendations_created_at 
ON public.collaborator_recommendations(created_at DESC);

-- Create partial unique index to prevent duplicate pending recommendations
CREATE UNIQUE INDEX IF NOT EXISTS idx_collaborator_recommendations_unique_pending
ON public.collaborator_recommendations(sender_user_id, collaborator_user_id, startup_id)
WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.collaborator_recommendations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Senders can view their own recommendations" ON public.collaborator_recommendations;
CREATE POLICY "Senders can view their own recommendations" 
ON public.collaborator_recommendations
FOR SELECT 
USING (auth.uid() = sender_user_id);

DROP POLICY IF EXISTS "Collaborators can view recommendations sent to them" ON public.collaborator_recommendations;
CREATE POLICY "Collaborators can view recommendations sent to them" 
ON public.collaborator_recommendations
FOR SELECT 
USING (auth.uid() = collaborator_user_id);

DROP POLICY IF EXISTS "Only senders can create recommendations" ON public.collaborator_recommendations;
CREATE POLICY "Only senders can create recommendations" 
ON public.collaborator_recommendations
FOR INSERT 
WITH CHECK (auth.uid() = sender_user_id);

DROP POLICY IF EXISTS "Collaborators can update recommendation status" ON public.collaborator_recommendations;
CREATE POLICY "Collaborators can update recommendation status" 
ON public.collaborator_recommendations
FOR UPDATE 
USING (auth.uid() = collaborator_user_id)
WITH CHECK (auth.uid() = collaborator_user_id);

DROP POLICY IF EXISTS "Senders can delete their own recommendations" ON public.collaborator_recommendations;
CREATE POLICY "Senders can delete their own recommendations" 
ON public.collaborator_recommendations
FOR DELETE 
USING (auth.uid() = sender_user_id);

-- Create trigger function
CREATE OR REPLACE FUNCTION update_collaborator_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_collaborator_recommendations_updated_at ON public.collaborator_recommendations;
CREATE TRIGGER update_collaborator_recommendations_updated_at
    BEFORE UPDATE ON public.collaborator_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION update_collaborator_recommendations_updated_at();

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '✅ Setup Complete!' as status;

SELECT 
    'investor_connection_requests' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'investor_connection_requests';

SELECT 
    'collaborator_recommendations' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'collaborator_recommendations';

