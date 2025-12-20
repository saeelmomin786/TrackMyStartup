-- =====================================================
-- GOOGLE CALENDAR INTEGRATIONS TABLE - COMPLETE
-- =====================================================
-- Stores Google Calendar OAuth tokens for mentors and startups
-- Enables optional Google Calendar sync

CREATE TABLE IF NOT EXISTS google_calendar_integrations (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_type TEXT NOT NULL CHECK (user_type IN ('Mentor', 'Startup')),
    
    -- Google Calendar info
    google_calendar_id TEXT NOT NULL,
    google_email TEXT NOT NULL,
    
    -- OAuth tokens (should be encrypted in production)
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Settings
    calendar_sync_enabled BOOLEAN DEFAULT true,
    auto_create_events BOOLEAN DEFAULT true,
    auto_create_meet_links BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one integration per user type
    UNIQUE(user_id, user_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_google_calendar_integrations_user_id 
ON google_calendar_integrations(user_id);

CREATE INDEX IF NOT EXISTS idx_google_calendar_integrations_sync_enabled 
ON google_calendar_integrations(user_id, calendar_sync_enabled) 
WHERE calendar_sync_enabled = true;

-- Enable RLS
ALTER TABLE google_calendar_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own integrations
CREATE POLICY "Users can view their own calendar integrations"
ON google_calendar_integrations FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own integrations
CREATE POLICY "Users can insert their own calendar integrations"
ON google_calendar_integrations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own integrations
CREATE POLICY "Users can update their own calendar integrations"
ON google_calendar_integrations FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own integrations
CREATE POLICY "Users can delete their own calendar integrations"
ON google_calendar_integrations FOR DELETE
USING (auth.uid() = user_id);

