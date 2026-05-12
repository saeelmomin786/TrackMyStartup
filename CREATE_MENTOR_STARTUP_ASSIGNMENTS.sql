-- ============================================================
-- Mentor Startup Assignments & Meeting History
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create mentor_startup_assignments table
--    Tracks which mentors are assigned to which startups
CREATE TABLE IF NOT EXISTS mentor_startup_assignments (
  id                  BIGSERIAL PRIMARY KEY,
  mentor_user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  startup_id          BIGINT NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  facilitator_code    TEXT,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by         UUID REFERENCES auth.users(id),
  deactivated_at      TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mentor_user_id, startup_id)
);

CREATE INDEX IF NOT EXISTS idx_msa_mentor_user_id ON mentor_startup_assignments (mentor_user_id);
CREATE INDEX IF NOT EXISTS idx_msa_startup_id ON mentor_startup_assignments (startup_id);
CREATE INDEX IF NOT EXISTS idx_msa_status ON mentor_startup_assignments (status);

-- 2. Create mentor_meeting_history table
--    Tracks all meetings between mentors and startups with details
CREATE TABLE IF NOT EXISTS mentor_meeting_history (
  id                      BIGSERIAL PRIMARY KEY,
  mentor_startup_assignment_id BIGINT NOT NULL REFERENCES mentor_startup_assignments(id) ON DELETE CASCADE,
  mentor_user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  startup_id              BIGINT NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  meeting_date            TIMESTAMPTZ NOT NULL,
  meeting_duration_mins   INT,
  google_meet_link        TEXT,
  ai_notes                TEXT,
  topics_discussed        TEXT[],
  action_items            TEXT,
  attendance_status       TEXT DEFAULT 'attended' CHECK (attendance_status IN ('attended', 'missed', 'rescheduled')),
  recording_url           TEXT,
  meeting_status          TEXT DEFAULT 'completed' CHECK (meeting_status IN ('scheduled', 'completed', 'cancelled')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mmh_mentor_user_id ON mentor_meeting_history (mentor_user_id);
CREATE INDEX IF NOT EXISTS idx_mmh_startup_id ON mentor_meeting_history (startup_id);
CREATE INDEX IF NOT EXISTS idx_mmh_meeting_date ON mentor_meeting_history (meeting_date);
CREATE INDEX IF NOT EXISTS idx_mmh_assignment_id ON mentor_meeting_history (mentor_startup_assignment_id);

-- 3. RLS Policies for mentor_startup_assignments

ALTER TABLE mentor_startup_assignments ENABLE ROW LEVEL SECURITY;

-- Mentors can view their own assignments
CREATE POLICY "mentors_view_own_assignments" ON mentor_startup_assignments
  FOR SELECT
  USING (mentor_user_id = auth.uid());

-- Mentors can update their own assignments
CREATE POLICY "mentors_update_own_assignments" ON mentor_startup_assignments
  FOR UPDATE
  USING (mentor_user_id = auth.uid())
  WITH CHECK (mentor_user_id = auth.uid());

-- Startup founders can view mentors assigned to them
CREATE POLICY "startups_view_assigned_mentors" ON mentor_startup_assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM startups s
      WHERE s.id = mentor_startup_assignments.startup_id
        AND s.user_id = auth.uid()
    )
  );

-- Facilitators can view and manage assignments
CREATE POLICY "facilitators_manage_assignments" ON mentor_startup_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.auth_user_id = auth.uid()
        AND up.facilitator_code = mentor_startup_assignments.facilitator_code
    )
  );

-- 4. RLS Policies for mentor_meeting_history

ALTER TABLE mentor_meeting_history ENABLE ROW LEVEL SECURITY;

-- Mentors can view their own meeting history
CREATE POLICY "mentors_view_own_history" ON mentor_meeting_history
  FOR SELECT
  USING (mentor_user_id = auth.uid());

-- Mentors can insert their own meeting records
CREATE POLICY "mentors_insert_own_history" ON mentor_meeting_history
  FOR INSERT
  WITH CHECK (mentor_user_id = auth.uid());

-- Mentors can update their own meeting records
CREATE POLICY "mentors_update_own_history" ON mentor_meeting_history
  FOR UPDATE
  USING (mentor_user_id = auth.uid())
  WITH CHECK (mentor_user_id = auth.uid());

-- Startup founders can view meeting history for their mentors
CREATE POLICY "startups_view_meeting_history" ON mentor_meeting_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM startups s
      WHERE s.id = mentor_meeting_history.startup_id
        AND s.user_id = auth.uid()
    )
  );

-- Facilitators can view all history for their mentors
CREATE POLICY "facilitators_view_meeting_history" ON mentor_meeting_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM mentor_startup_assignments msa
      WHERE msa.id = mentor_meeting_history.mentor_startup_assignment_id
        AND msa.facilitator_code IN (
          SELECT facilitator_code FROM user_profiles
          WHERE auth_user_id = auth.uid()
        )
    )
  );

-- 5. Auto-update updated_at triggers

CREATE TRIGGER trg_msa_updated_at
  BEFORE UPDATE ON mentor_startup_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_mmh_updated_at
  BEFORE UPDATE ON mentor_meeting_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Optional: Function to get mentor profile with assignment info
CREATE OR REPLACE FUNCTION get_mentor_with_assignments(p_mentor_user_id UUID)
RETURNS TABLE (
  mentor_id UUID,
  mentor_name TEXT,
  mentor_email TEXT,
  mentor_expertise TEXT[],
  total_assignments INT,
  active_assignments INT,
  total_meetings INT,
  last_meeting_date TIMESTAMPTZ
) AS $$
SELECT
  up.auth_user_id,
  up.full_name,
  au.email,
  up.expertise,
  (SELECT COUNT(*) FROM mentor_startup_assignments WHERE mentor_user_id = p_mentor_user_id)::INT,
  (SELECT COUNT(*) FROM mentor_startup_assignments WHERE mentor_user_id = p_mentor_user_id AND status = 'active')::INT,
  (SELECT COUNT(*) FROM mentor_meeting_history WHERE mentor_user_id = p_mentor_user_id)::INT,
  (SELECT MAX(meeting_date) FROM mentor_meeting_history WHERE mentor_user_id = p_mentor_user_id)
FROM user_profiles up
JOIN auth.users au ON up.auth_user_id = au.id
WHERE up.auth_user_id = p_mentor_user_id;
$$ LANGUAGE SQL SECURITY DEFINER;

-- 7. Function to get mentor meeting history for a specific startup
CREATE OR REPLACE FUNCTION get_mentor_startup_history(p_mentor_user_id UUID, p_startup_id BIGINT)
RETURNS TABLE (
  meeting_id BIGINT,
  meeting_date TIMESTAMPTZ,
  duration_mins INT,
  google_meet_link TEXT,
  ai_notes TEXT,
  topics_discussed TEXT[],
  action_items TEXT,
  attendance_status TEXT,
  meeting_status TEXT
) AS $$
SELECT
  id,
  meeting_date,
  meeting_duration_mins,
  google_meet_link,
  ai_notes,
  topics_discussed,
  action_items,
  attendance_status,
  meeting_status
FROM mentor_meeting_history
WHERE mentor_user_id = p_mentor_user_id
  AND startup_id = p_startup_id
ORDER BY meeting_date DESC;
$$ LANGUAGE SQL SECURITY DEFINER;
