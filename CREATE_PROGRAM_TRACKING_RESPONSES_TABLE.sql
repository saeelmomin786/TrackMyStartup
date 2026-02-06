-- Create table for Track My Startup program question responses
-- This stores answers from startups for the tracking questions in each program

CREATE TABLE IF NOT EXISTS program_tracking_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id INTEGER NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  facilitator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_name TEXT NOT NULL,
  question_id UUID NOT NULL REFERENCES application_question_bank(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Composite unique constraint: one answer per startup per program per question
  UNIQUE(startup_id, facilitator_id, program_name, question_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_tracking_responses_startup_facilitator_program
ON program_tracking_responses(startup_id, facilitator_id, program_name);

CREATE INDEX idx_tracking_responses_facilitator_program
ON program_tracking_responses(facilitator_id, program_name);

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_tracking_responses_updated_at
BEFORE UPDATE ON program_tracking_responses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE program_tracking_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Startups can manage their own responses
CREATE POLICY "startups_can_insert_tracking_responses"
ON program_tracking_responses
FOR INSERT
TO authenticated
WITH CHECK (
  startup_id IN (
    SELECT startup_id FROM user_profiles WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "startups_can_update_tracking_responses"
ON program_tracking_responses
FOR UPDATE
TO authenticated
USING (
  startup_id IN (
    SELECT startup_id FROM user_profiles WHERE auth_user_id = auth.uid()
  )
)
WITH CHECK (
  startup_id IN (
    SELECT startup_id FROM user_profiles WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "startups_can_select_tracking_responses"
ON program_tracking_responses
FOR SELECT
TO authenticated
USING (
  startup_id IN (
    SELECT startup_id FROM user_profiles WHERE auth_user_id = auth.uid()
  )
);

-- RLS Policies: Facilitators can read responses for their programs
CREATE POLICY "facilitators_can_read_tracking_responses"
ON program_tracking_responses
FOR SELECT
TO authenticated
USING (
  facilitator_id = auth.uid()
);

-- Verify table creation
SELECT tablename FROM pg_tables WHERE tablename = 'program_tracking_responses';
