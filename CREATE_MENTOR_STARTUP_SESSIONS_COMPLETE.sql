-- =====================================================
-- MENTOR-STARTUP SESSIONS TABLE - COMPLETE
-- =====================================================
-- Stores scheduled mentoring sessions between mentor and startup
-- Includes Google Meet links and calendar integration

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
    google_meet_link TEXT, -- Store Google Meet link (always generated)
    google_calendar_synced BOOLEAN DEFAULT false,
    
    -- Additional info
    notes TEXT,
    agenda TEXT, -- Session agenda/topics
    feedback TEXT, -- Post-session feedback
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT check_duration_positive CHECK (duration_minutes > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mentor_startup_sessions_mentor_id 
ON mentor_startup_sessions(mentor_id);

CREATE INDEX IF NOT EXISTS idx_mentor_startup_sessions_startup_id 
ON mentor_startup_sessions(startup_id);

CREATE INDEX IF NOT EXISTS idx_mentor_startup_sessions_assignment_id 
ON mentor_startup_sessions(assignment_id);

CREATE INDEX IF NOT EXISTS idx_mentor_startup_sessions_date 
ON mentor_startup_sessions(session_date, session_time);

CREATE INDEX IF NOT EXISTS idx_mentor_startup_sessions_status 
ON mentor_startup_sessions(mentor_id, status) 
WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_mentor_startup_sessions_upcoming 
ON mentor_startup_sessions(session_date, session_time) 
WHERE status = 'scheduled';

-- Enable RLS
ALTER TABLE mentor_startup_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Mentors can view their own sessions
CREATE POLICY "Mentors can view their own sessions"
ON mentor_startup_sessions FOR SELECT
USING (auth.uid() = mentor_id);

-- Startups can view their own sessions
CREATE POLICY "Startups can view their own sessions"
ON mentor_startup_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.startups s
    WHERE s.id = mentor_startup_sessions.startup_id
    AND s.user_id = auth.uid()
  )
);

-- Mentors can create sessions for their assignments
CREATE POLICY "Mentors can create sessions"
ON mentor_startup_sessions FOR INSERT
WITH CHECK (
  auth.uid() = mentor_id AND
  EXISTS (
    SELECT 1 FROM mentor_startup_assignments msa
    WHERE msa.id = assignment_id
    AND msa.mentor_id = auth.uid()
  )
);

-- Mentors can update their own sessions
CREATE POLICY "Mentors can update their own sessions"
ON mentor_startup_sessions FOR UPDATE
USING (auth.uid() = mentor_id);

-- Startups can update their own sessions (for cancellation)
CREATE POLICY "Startups can update their own sessions"
ON mentor_startup_sessions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.startups s
    WHERE s.id = mentor_startup_sessions.startup_id
    AND s.user_id = auth.uid()
  )
);

-- Mentors can delete their own sessions
CREATE POLICY "Mentors can delete their own sessions"
ON mentor_startup_sessions FOR DELETE
USING (auth.uid() = mentor_id);

