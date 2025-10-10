-- Create table to store startup invitations from facilitators
-- This will track invitations sent to startups to join the platform

-- Create the startup_invitations table
CREATE TABLE IF NOT EXISTS public.startup_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    facilitator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    startup_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    facilitator_code VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'declined')),
    invitation_sent_at TIMESTAMP WITH TIME ZONE,
    response_received_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_startup_invitations_facilitator_id 
ON public.startup_invitations(facilitator_id);

CREATE INDEX IF NOT EXISTS idx_startup_invitations_status 
ON public.startup_invitations(status);

CREATE INDEX IF NOT EXISTS idx_startup_invitations_email 
ON public.startup_invitations(email);

CREATE INDEX IF NOT EXISTS idx_startup_invitations_facilitator_code 
ON public.startup_invitations(facilitator_code);

-- Enable RLS
ALTER TABLE public.startup_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Facilitators can only see their own invitations
CREATE POLICY "Facilitators can view their own invitations" ON public.startup_invitations
    FOR SELECT USING (auth.uid() = facilitator_id);

-- Facilitators can insert their own invitations
CREATE POLICY "Facilitators can insert their own invitations" ON public.startup_invitations
    FOR INSERT WITH CHECK (auth.uid() = facilitator_id);

-- Facilitators can update their own invitations
CREATE POLICY "Facilitators can update their own invitations" ON public.startup_invitations
    FOR UPDATE USING (auth.uid() = facilitator_id);

-- Facilitators can delete their own invitations
CREATE POLICY "Facilitators can delete their own invitations" ON public.startup_invitations
    FOR DELETE USING (auth.uid() = facilitator_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_startup_invitations_updated_at 
    BEFORE UPDATE ON public.startup_invitations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
