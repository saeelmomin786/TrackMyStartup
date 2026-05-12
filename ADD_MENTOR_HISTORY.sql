-- ============================================================
-- Mentor Assignment History and Activity Tracking
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create mentor_assignment_history table
--    Tracks all changes and activities related to mentor assignments
CREATE TABLE IF NOT EXISTS mentor_assignment_history (
  id              BIGSERIAL PRIMARY KEY,
  assignment_id   BIGINT REFERENCES mentor_facilitator_assignments(id) ON DELETE CASCADE,
  mentor_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facilitator_user_id UUID REFERENCES auth.users(id),
  startup_id      INTEGER,
  action          TEXT NOT NULL CHECK (action IN ('assigned', 'activated', 'deactivated', 'completed', 'meeting_added', 'status_changed')),
  action_details  JSONB,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_mah_assignment_id ON mentor_assignment_history (assignment_id);
CREATE INDEX IF NOT EXISTS idx_mah_mentor_user_id ON mentor_assignment_history (mentor_user_id);
CREATE INDEX IF NOT EXISTS idx_mah_facilitator_user_id ON mentor_assignment_history (facilitator_user_id);
CREATE INDEX IF NOT EXISTS idx_mah_startup_id ON mentor_assignment_history (startup_id);
CREATE INDEX IF NOT EXISTS idx_mah_created_at ON mentor_assignment_history (created_at);

-- 2. RLS Policies for mentor_assignment_history
ALTER TABLE mentor_assignment_history ENABLE ROW LEVEL SECURITY;

-- Facilitators can view history for their assignments
CREATE POLICY "facilitators_view_history" ON mentor_assignment_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.auth_user_id = auth.uid()
        AND facilitator_user_id = up.auth_user_id
    )
  );

-- Mentors can view their own history
CREATE POLICY "mentors_view_own_history" ON mentor_assignment_history
  FOR SELECT
  USING (mentor_user_id = auth.uid());

-- Facilitators can insert history records
CREATE POLICY "facilitators_insert_history" ON mentor_assignment_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.auth_user_id = auth.uid()
        AND facilitator_user_id = up.auth_user_id
    )
  );

-- 3. Function to log mentor actions
CREATE OR REPLACE FUNCTION log_mentor_action(
  p_assignment_id BIGINT,
  p_mentor_user_id UUID,
  p_facilitator_user_id UUID,
  p_startup_id INTEGER,
  p_action TEXT,
  p_details JSONB DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO mentor_assignment_history
    (assignment_id, mentor_user_id, facilitator_user_id, startup_id, action, action_details, notes, created_by)
  VALUES
    (p_assignment_id, p_mentor_user_id, p_facilitator_user_id, p_startup_id, p_action, p_details, p_notes, auth.uid());
END;
$$ LANGUAGE plpgsql;
