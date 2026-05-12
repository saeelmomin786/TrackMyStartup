-- ============================================================
-- Mentor Facilitator Management Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add facilitator_code column to mentor_profiles
--    Mentors enter their incubation center code from their dashboard
ALTER TABLE mentor_profiles
  ADD COLUMN IF NOT EXISTS facilitator_code TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_mentor_profiles_facilitator_code
  ON mentor_profiles (facilitator_code);

-- 2. Create facilitator_mentor_assignments table
--    Incubation centers assign mentors to specific startups
CREATE TABLE IF NOT EXISTS facilitator_mentor_assignments (
  id              BIGSERIAL PRIMARY KEY,
  facilitator_code TEXT NOT NULL,
  mentor_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  startup_id      INTEGER NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'removed')),
  notes           TEXT,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (facilitator_code, mentor_user_id, startup_id)
);

CREATE INDEX IF NOT EXISTS idx_fma_facilitator_code ON facilitator_mentor_assignments (facilitator_code);
CREATE INDEX IF NOT EXISTS idx_fma_mentor_user_id   ON facilitator_mentor_assignments (mentor_user_id);
CREATE INDEX IF NOT EXISTS idx_fma_startup_id       ON facilitator_mentor_assignments (startup_id);

-- 3. Create mentor_meeting_records table
--    Track every meeting / touchpoint between a mentor and a startup
CREATE TABLE IF NOT EXISTS mentor_meeting_records (
  id              BIGSERIAL PRIMARY KEY,
  assignment_id   BIGINT NOT NULL REFERENCES facilitator_mentor_assignments(id) ON DELETE CASCADE,
  facilitator_code TEXT NOT NULL,
  mentor_user_id  UUID NOT NULL,
  startup_id      INTEGER NOT NULL,
  title           TEXT NOT NULL,
  meeting_date    DATE NOT NULL,
  meeting_type    TEXT NOT NULL DEFAULT 'General' CHECK (
    meeting_type IN ('General', 'Strategy', 'Technical', 'Financial', 'Marketing', 'HR', 'Investor Prep', 'Review', 'Other')
  ),
  duration_minutes INTEGER,
  notes           TEXT,
  outcomes        TEXT,
  next_steps      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mmr_assignment_id    ON mentor_meeting_records (assignment_id);
CREATE INDEX IF NOT EXISTS idx_mmr_facilitator_code ON mentor_meeting_records (facilitator_code);
CREATE INDEX IF NOT EXISTS idx_mmr_mentor_user_id   ON mentor_meeting_records (mentor_user_id);
CREATE INDEX IF NOT EXISTS idx_mmr_startup_id       ON mentor_meeting_records (startup_id);

-- 4. RLS Policies

ALTER TABLE facilitator_mentor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_meeting_records         ENABLE ROW LEVEL SECURITY;

-- facilitator_mentor_assignments: facilitators can manage, mentors can read their own
CREATE POLICY "facilitators_manage_assignments" ON facilitator_mentor_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.auth_user_id = auth.uid()
        AND up.facilitator_code = facilitator_mentor_assignments.facilitator_code
    )
  );

CREATE POLICY "mentors_view_own_assignments" ON facilitator_mentor_assignments
  FOR SELECT
  USING (mentor_user_id = auth.uid());

-- mentor_meeting_records: same access model
CREATE POLICY "facilitators_manage_meeting_records" ON mentor_meeting_records
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.auth_user_id = auth.uid()
        AND up.facilitator_code = mentor_meeting_records.facilitator_code
    )
  );

CREATE POLICY "mentors_view_own_meeting_records" ON mentor_meeting_records
  FOR SELECT
  USING (mentor_user_id = auth.uid());

-- 5. Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fma_updated_at ON facilitator_mentor_assignments;
CREATE TRIGGER trg_fma_updated_at
  BEFORE UPDATE ON facilitator_mentor_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_mmr_updated_at ON mentor_meeting_records;
CREATE TRIGGER trg_mmr_updated_at
  BEFORE UPDATE ON mentor_meeting_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
