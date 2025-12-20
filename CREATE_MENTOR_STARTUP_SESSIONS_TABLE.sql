-- =====================================================
-- MENTOR-STARTUP SESSIONS TABLE
-- =====================================================
-- Stores scheduled mentoring sessions between mentor and startup

CREATE TABLE IF NOT EXISTS mentor_startup_sessions (
    id BIGSERIAL PRIMARY KEY,
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    startup_id INTEGER NOT NULL REFERENCES public.startups(id) ON DELETE CASCADE,
    assignment_id INTEGER REFERENCES mentor_startup_assignments(id) ON DELETE CASCADE,
    
    -- Session details
    session_date DATE NOT NULL,
    session_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    timezone TEXT DEFAULT 'UTC',
    
    -- Status
    status TEXT NOT NULL DEFAULT 'scheduled' 
      CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show')),
    
    -- Google Calendar integration
    google_calendar_event_id TEXT, -- Store Google Calendar event ID
    google_meet_link TEXT, -- Store Google Meet link if created
    google_calendar_synced BOOLEAN DEFAULT false,
    
    -- Additional info
    notes TEXT,
    agenda TEXT, -- Session agenda/topics
    feedback TEXT, -- Post-session feedback
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mentor_startup_sessions_mentor_id 
ON mentor_startup_sessions(mentor_id);

CREATE INDEX IF NOT EXISTS idx_mentor_startup_sessions_startup_id 
ON mentor_startup_sessions(startup_id);

CREATE INDEX IF NOT EXISTS idx_mentor_startup_sessions_assignment_id 
ON mentor_startup_sessions(assignment_id);

CREATE INDEX IF NOT EXISTS idx_mentor_startup_sessions_date 
ON mentor_startup_sessions(session_date, session_time);

-- Enable RLS
ALTER TABLE mentor_startup_sessions ENABLE ROW LEVEL SECURITY;


