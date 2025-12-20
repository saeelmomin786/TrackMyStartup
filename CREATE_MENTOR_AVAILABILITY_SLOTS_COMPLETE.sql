-- =====================================================
-- MENTOR AVAILABILITY SLOTS TABLE - COMPLETE
-- =====================================================
-- Stores mentor's available time slots for scheduling sessions
-- Supports both recurring and one-time slots

CREATE TABLE IF NOT EXISTS mentor_availability_slots (
    id BIGSERIAL PRIMARY KEY,
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Slot timing
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday, NULL for specific dates
    specific_date DATE, -- For one-time slots (if day_of_week is NULL)
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone TEXT DEFAULT 'UTC',
    
    -- Recurring vs one-time
    is_recurring BOOLEAN DEFAULT false,
    valid_from DATE,
    valid_until DATE,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_slot_type CHECK (
        (day_of_week IS NOT NULL AND specific_date IS NULL) OR 
        (day_of_week IS NULL AND specific_date IS NOT NULL)
    ),
    CONSTRAINT check_time_order CHECK (end_time > start_time)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mentor_availability_slots_mentor_id 
ON mentor_availability_slots(mentor_id);

CREATE INDEX IF NOT EXISTS idx_mentor_availability_slots_active 
ON mentor_availability_slots(mentor_id, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_mentor_availability_slots_date 
ON mentor_availability_slots(specific_date) 
WHERE specific_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mentor_availability_slots_recurring 
ON mentor_availability_slots(mentor_id, day_of_week, is_recurring) 
WHERE is_recurring = true AND is_active = true;

-- Enable RLS
ALTER TABLE mentor_availability_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Mentors can manage their own availability slots
CREATE POLICY "Mentors can view their own availability slots"
ON mentor_availability_slots FOR SELECT
USING (auth.uid() = mentor_id);

CREATE POLICY "Mentors can insert their own availability slots"
ON mentor_availability_slots FOR INSERT
WITH CHECK (auth.uid() = mentor_id);

CREATE POLICY "Mentors can update their own availability slots"
ON mentor_availability_slots FOR UPDATE
USING (auth.uid() = mentor_id);

CREATE POLICY "Mentors can delete their own availability slots"
ON mentor_availability_slots FOR DELETE
USING (auth.uid() = mentor_id);

-- Startups can view active availability slots (for booking)
CREATE POLICY "Startups can view active availability slots"
ON mentor_availability_slots FOR SELECT
USING (is_active = true);

