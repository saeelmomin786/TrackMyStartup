-- =====================================================
-- MENTOR AVAILABILITY SLOTS TABLE
-- =====================================================
-- Stores mentor's available time slots for scheduling sessions

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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mentor_availability_slots_mentor_id 
ON mentor_availability_slots(mentor_id);

CREATE INDEX IF NOT EXISTS idx_mentor_availability_slots_active 
ON mentor_availability_slots(mentor_id, is_active) 
WHERE is_active = true;

-- Enable RLS
ALTER TABLE mentor_availability_slots ENABLE ROW LEVEL SECURITY;


