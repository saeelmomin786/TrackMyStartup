-- Create table for Track My Startup program questions
-- This allows facilitators to configure questions for each program in Track My Startup

CREATE TABLE IF NOT EXISTS incubation_program_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_name TEXT NOT NULL,
  question_id UUID NOT NULL REFERENCES application_question_bank(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT true,
  selection_type TEXT CHECK (selection_type IN ('single', 'multiple', NULL)),
  display_order INTEGER NOT NULL,
  facilitator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Composite unique constraint: one facilitator can have each question once per program
  UNIQUE(facilitator_id, program_name, question_id)
);

-- Create index for faster lookups
CREATE INDEX idx_program_questions_facilitator_program 
ON incubation_program_questions(facilitator_id, program_name);

CREATE INDEX idx_program_questions_facilitator_program_order 
ON incubation_program_questions(facilitator_id, program_name, display_order);

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_program_questions_updated_at
BEFORE UPDATE ON incubation_program_questions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE incubation_program_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Facilitators can manage their own program questions
CREATE POLICY "facilitators_can_insert_program_questions"
ON incubation_program_questions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = facilitator_id
);

CREATE POLICY "facilitators_can_update_program_questions"
ON incubation_program_questions
FOR UPDATE
TO authenticated
USING (
  auth.uid() = facilitator_id
)
WITH CHECK (
  auth.uid() = facilitator_id
);

CREATE POLICY "facilitators_can_delete_program_questions"
ON incubation_program_questions
FOR DELETE
TO authenticated
USING (
  auth.uid() = facilitator_id
);

-- RLS Policy: Facilitators can select their own program questions
CREATE POLICY "facilitators_can_select_program_questions"
ON incubation_program_questions
FOR SELECT
TO authenticated
USING (
  auth.uid() = facilitator_id
);

-- Also allow startups to read questions for programs they have applications for
CREATE POLICY "startups_can_read_program_questions"
ON incubation_program_questions
FOR SELECT
TO authenticated
USING (
  -- Startup can read questions if they have an application to an opportunity with this program
  EXISTS (
    SELECT 1
    FROM opportunity_applications oa
    JOIN incubation_opportunities io ON oa.opportunity_id = io.id
    WHERE oa.startup_id = (
      SELECT startup_id FROM user_profiles WHERE auth_user_id = auth.uid()
    )
    AND io.facilitator_id = incubation_program_questions.facilitator_id
    AND io.program_name = incubation_program_questions.program_name
  )
);

-- Verify table creation
SELECT tablename FROM pg_tables WHERE tablename = 'incubation_program_questions';
