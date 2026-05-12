-- ============================================================
-- Mentor Facilitator Associations - Approval & Status Management
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create mentor_facilitator_associations table
--    Tracks which mentors are associated with which facilitators
--    Supports multiple codes per mentor and approval workflow
CREATE TABLE IF NOT EXISTS mentor_facilitator_associations (
  id              BIGSERIAL PRIMARY KEY,
  mentor_user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facilitator_code TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'inactive', 'rejected')),
  is_active       BOOLEAN NOT NULL DEFAULT false,
  approved_at     TIMESTAMPTZ,
  approved_by     UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mentor_user_id, facilitator_code)
);

CREATE INDEX IF NOT EXISTS idx_mfa_mentor_user_id ON mentor_facilitator_associations (mentor_user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_facilitator_code ON mentor_facilitator_associations (facilitator_code);
CREATE INDEX IF NOT EXISTS idx_mfa_status ON mentor_facilitator_associations (status);

-- 2. RLS Policies for mentor_facilitator_associations

ALTER TABLE mentor_facilitator_associations ENABLE ROW LEVEL SECURITY;

-- Mentors can view and create their own associations
CREATE POLICY "mentors_manage_own_associations" ON mentor_facilitator_associations
  FOR ALL
  USING (mentor_user_id = auth.uid())
  WITH CHECK (mentor_user_id = auth.uid());

-- Facilitators can approve and manage associations for their code
CREATE POLICY "facilitators_manage_associations" ON mentor_facilitator_associations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.auth_user_id = auth.uid()
        AND up.facilitator_code = mentor_facilitator_associations.facilitator_code
    )
  );

-- 3. Auto-update updated_at
CREATE TRIGGER trg_mfa_updated_at
  BEFORE UPDATE ON mentor_facilitator_associations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
