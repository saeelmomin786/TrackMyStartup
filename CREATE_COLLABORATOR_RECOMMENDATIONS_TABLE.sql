-- =====================================================
-- COLLABORATOR RECOMMENDATIONS TABLE
-- =====================================================
-- PURPOSE: Store recommendations sent by investors to their collaborators
--          When an investor clicks "Recommend" on a startup in Discover tab,
--          they can send it to their accepted collaborators (Investment Advisors,
--          Mentors, CA, CS, Incubators, etc.)
--
-- FLOW:
-- 1. Investor opens Discover tab → sees startup cards
-- 2. Investor clicks "Recommend" button on a startup
-- 3. Modal shows list of accepted collaborators (from investor_connection_requests)
-- 4. Investor selects collaborator → creates record in this table
-- 5. Collaborator sees recommendation in their dashboard with sender name
--
-- NOTE: This is SEPARATE from existing Investment Advisor → Investor recommendation flow
--       Existing flow remains unchanged, this is only for investor → collaborator recommendations

CREATE TABLE IF NOT EXISTS public.collaborator_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Who sent the recommendation (the investor)
    sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_name TEXT, -- Investor's name for display in collaborator's dashboard
    
    -- Who receives the recommendation (the collaborator)
    collaborator_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Which startup is being recommended
    startup_id INTEGER NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    startup_name TEXT NOT NULL, -- Startup name for quick display
    
    -- Optional fields
    message TEXT, -- Optional message from investor
    startup_profile_url TEXT, -- Shareable URL to startup profile (optional)
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'accepted', 'rejected')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    viewed_at TIMESTAMP WITH TIME ZONE, -- When collaborator viewed the recommendation
    responded_at TIMESTAMP WITH TIME ZONE -- When collaborator responded (accepted/rejected)
);

-- Create indexes for better query performance
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

-- Enable Row Level Security (RLS)
ALTER TABLE public.collaborator_recommendations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this script)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'collaborator_recommendations' AND policyname = 'Senders can view their own recommendations') THEN
        DROP POLICY "Senders can view their own recommendations" ON public.collaborator_recommendations;
    END IF;
    
    IF EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'collaborator_recommendations' AND policyname = 'Collaborators can view recommendations sent to them') THEN
        DROP POLICY "Collaborators can view recommendations sent to them" ON public.collaborator_recommendations;
    END IF;
    
    IF EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'collaborator_recommendations' AND policyname = 'Only senders can create recommendations') THEN
        DROP POLICY "Only senders can create recommendations" ON public.collaborator_recommendations;
    END IF;
    
    IF EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'collaborator_recommendations' AND policyname = 'Collaborators can update recommendation status') THEN
        DROP POLICY "Collaborators can update recommendation status" ON public.collaborator_recommendations;
    END IF;
    
    IF EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'collaborator_recommendations' AND policyname = 'Senders can delete their own recommendations') THEN
        DROP POLICY "Senders can delete their own recommendations" ON public.collaborator_recommendations;
    END IF;
END $$;

-- RLS Policies

-- Policy 1: Senders can view their own sent recommendations
-- PURPOSE: Investors can see recommendations they sent
CREATE POLICY "Senders can view their own recommendations" 
ON public.collaborator_recommendations
FOR SELECT 
USING (auth.uid() = sender_user_id);

-- Policy 2: Collaborators can view recommendations sent to them
-- PURPOSE: Collaborators can see recommendations they received
CREATE POLICY "Collaborators can view recommendations sent to them" 
ON public.collaborator_recommendations
FOR SELECT 
USING (auth.uid() = collaborator_user_id);

-- Policy 3: Only senders can create recommendations
-- PURPOSE: Only investors can send recommendations (not collaborators)
CREATE POLICY "Only senders can create recommendations" 
ON public.collaborator_recommendations
FOR INSERT 
WITH CHECK (auth.uid() = sender_user_id);

-- Policy 4: Collaborators can update status (view/accept/reject)
-- PURPOSE: Collaborators can mark recommendations as viewed, accepted, or rejected
CREATE POLICY "Collaborators can update recommendation status" 
ON public.collaborator_recommendations
FOR UPDATE 
USING (auth.uid() = collaborator_user_id)
WITH CHECK (auth.uid() = collaborator_user_id);

-- Policy 5: Senders can delete their own recommendations (optional)
-- PURPOSE: Investors can delete recommendations they sent (before collaborator views)
CREATE POLICY "Senders can delete their own recommendations" 
ON public.collaborator_recommendations
FOR DELETE 
USING (auth.uid() = sender_user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_collaborator_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then recreate
DROP TRIGGER IF EXISTS update_collaborator_recommendations_updated_at ON public.collaborator_recommendations;

CREATE TRIGGER update_collaborator_recommendations_updated_at
    BEFORE UPDATE ON public.collaborator_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION update_collaborator_recommendations_updated_at();

-- Verify table creation
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'collaborator_recommendations'
ORDER BY ordinal_position;

