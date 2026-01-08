-- =====================================================
-- COMPLETE SETUP FOR CRM GRANT/INCUBATION PROGRAMS
-- =====================================================
-- This script creates the incubation_programs table with:
-- - Grant as a program type
-- - Optional start_date and end_date
-- - All necessary indexes, RLS policies, and triggers

-- =====================================================
-- STEP 1: CREATE TABLE (if it doesn't exist)
-- =====================================================
CREATE TABLE IF NOT EXISTS incubation_programs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    startup_id INTEGER NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
    program_name TEXT NOT NULL,
    program_type TEXT NOT NULL CHECK (program_type IN ('Grant', 'Incubation', 'Acceleration', 'Mentorship', 'Bootcamp')),
    start_date DATE,  -- Optional (nullable)
    end_date DATE,   -- Optional (nullable)
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Dropped')),
    description TEXT,
    mentor_name TEXT,
    mentor_email TEXT,
    program_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 2: CREATE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_incubation_programs_startup_id ON incubation_programs(startup_id);
CREATE INDEX IF NOT EXISTS idx_incubation_programs_program_type ON incubation_programs(program_type);
CREATE INDEX IF NOT EXISTS idx_incubation_programs_status ON incubation_programs(status);

-- =====================================================
-- STEP 3: CREATE UPDATED_AT TRIGGER FUNCTION (if it doesn't exist)
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 4: CREATE UPDATED_AT TRIGGER
-- =====================================================
DROP TRIGGER IF EXISTS update_incubation_programs_updated_at ON incubation_programs;
CREATE TRIGGER update_incubation_programs_updated_at
    BEFORE UPDATE ON incubation_programs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE incubation_programs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 6: CREATE RLS POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own startup's incubation programs" ON incubation_programs;
DROP POLICY IF EXISTS "Startup users can manage their own incubation programs" ON incubation_programs;
DROP POLICY IF EXISTS incubation_programs_select_own ON incubation_programs;
DROP POLICY IF EXISTS incubation_programs_manage_own ON incubation_programs;

-- Policy for viewing programs (using user_profiles instead of users table)
CREATE POLICY "Users can view their own startup's incubation programs" ON incubation_programs
    FOR SELECT USING (
        startup_id IN (
            SELECT id FROM startups 
            WHERE id IN (
                SELECT startup_id FROM user_profiles 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

-- Policy for managing programs (INSERT, UPDATE, DELETE)
CREATE POLICY "Startup users can manage their own incubation programs" ON incubation_programs
    FOR ALL USING (
        startup_id IN (
            SELECT id FROM startups 
            WHERE id IN (
                SELECT startup_id FROM user_profiles 
                WHERE auth_user_id = auth.uid()
            )
        )
    );

-- =====================================================
-- STEP 7: UPDATE EXISTING TABLE (if it already exists)
-- =====================================================
-- If the table already exists with old constraints, update them

-- Update program_type constraint to include 'Grant'
DO $$
BEGIN
    -- Drop old constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'incubation_programs'::regclass 
        AND conname = 'incubation_programs_program_type_check'
    ) THEN
        ALTER TABLE incubation_programs 
        DROP CONSTRAINT incubation_programs_program_type_check;
    END IF;
    
    -- Add new constraint with Grant
    ALTER TABLE incubation_programs 
    ADD CONSTRAINT incubation_programs_program_type_check 
    CHECK (program_type IN ('Grant', 'Incubation', 'Acceleration', 'Mentorship', 'Bootcamp'));
    
    -- Make dates optional if they're currently NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'incubation_programs' 
        AND column_name = 'start_date' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE incubation_programs ALTER COLUMN start_date DROP NOT NULL;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'incubation_programs' 
        AND column_name = 'end_date' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE incubation_programs ALTER COLUMN end_date DROP NOT NULL;
    END IF;
END $$;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this to verify everything was created correctly

SELECT 
    'Table Created' AS check_type,
    'incubation_programs' AS item_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'incubation_programs')
        THEN '✅ Table exists'
        ELSE '❌ Table missing'
    END AS status

UNION ALL

SELECT 
    'Program Type Constraint' AS check_type,
    conname AS item_name,
    CASE 
        WHEN pg_get_constraintdef(oid) LIKE '%Grant%'
        THEN '✅ Grant included'
        ELSE '❌ Grant missing'
    END AS status
FROM pg_constraint
WHERE conrelid = 'incubation_programs'::regclass
AND conname = 'incubation_programs_program_type_check'

UNION ALL

SELECT 
    'Start Date' AS check_type,
    column_name AS item_name,
    CASE 
        WHEN is_nullable = 'YES' THEN '✅ Optional (Nullable)'
        ELSE '❌ Required (NOT NULL)'
    END AS status
FROM information_schema.columns
WHERE table_name = 'incubation_programs'
AND column_name = 'start_date'

UNION ALL

SELECT 
    'End Date' AS check_type,
    column_name AS item_name,
    CASE 
        WHEN is_nullable = 'YES' THEN '✅ Optional (Nullable)'
        ELSE '❌ Required (NOT NULL)'
    END AS status
FROM information_schema.columns
WHERE table_name = 'incubation_programs'
AND column_name = 'end_date';

