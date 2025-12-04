-- =====================================================
-- CREATE MENTOR TABLES FOR TRACKING METRICS
-- =====================================================
-- This script creates tables to track mentor relationships,
-- requests, earnings, and founded startups
-- Supports manual entry of startups (startup_id can be null)
-- =====================================================

-- =====================================================
-- STEP 1: MENTOR-STARTUP ASSIGNMENTS
-- =====================================================
-- Tracks active and completed mentoring relationships
-- startup_id can be NULL for manually entered startups
-- Manual startup details stored in notes as JSON: {"startup_name": "...", "email_id": "...", "website": "...", "sector": "..."}
CREATE TABLE IF NOT EXISTS mentor_startup_assignments (
    id BIGSERIAL PRIMARY KEY,
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    startup_id INTEGER REFERENCES public.startups(id) ON DELETE CASCADE, -- NULLABLE for manual entries
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    fee_amount DECIMAL(15, 2) DEFAULT 0,
    fee_currency TEXT DEFAULT 'USD',
    esop_percentage DECIMAL(5, 2) DEFAULT 0,
    esop_value DECIMAL(15, 2) DEFAULT 0,
    notes TEXT -- Stores JSON for manual entries: {"startup_name": "...", "email_id": "...", "website": "...", "sector": "..."}
);

-- Unique constraint: Only enforce uniqueness when startup_id is NOT NULL
-- Multiple null startup_id entries are allowed (for manual entries)
CREATE UNIQUE INDEX IF NOT EXISTS mentor_startup_assignments_unique 
ON mentor_startup_assignments(mentor_id, startup_id) 
WHERE startup_id IS NOT NULL;

-- =====================================================
-- STEP 2: MENTOR REQUESTS
-- =====================================================
-- Tracks requests from startups/investors to mentors
CREATE TABLE IF NOT EXISTS mentor_requests (
    id BIGSERIAL PRIMARY KEY,
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requester_type TEXT NOT NULL CHECK (requester_type IN ('Startup', 'Investor')),
    startup_id INTEGER REFERENCES public.startups(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    message TEXT
);

-- =====================================================
-- STEP 3: MENTOR FOUNDED STARTUPS
-- =====================================================
-- Tracks startups that the mentor has founded
-- startup_id can be NULL for manually entered startups
-- Manual startup details stored in notes as JSON: {"startup_name": "...", "email_id": "...", "website": "...", "sector": "..."}
CREATE TABLE IF NOT EXISTS mentor_founded_startups (
    id BIGSERIAL PRIMARY KEY,
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    startup_id INTEGER REFERENCES public.startups(id) ON DELETE CASCADE, -- NULLABLE for manual entries
    founded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT -- Stores JSON for manual entries: {"startup_name": "...", "email_id": "...", "website": "...", "sector": "..."}
);

-- Unique constraint: Only enforce uniqueness when startup_id is NOT NULL
-- Multiple null startup_id entries are allowed (for manual entries)
CREATE UNIQUE INDEX IF NOT EXISTS mentor_founded_startups_unique 
ON mentor_founded_startups(mentor_id, startup_id) 
WHERE startup_id IS NOT NULL;

-- =====================================================
-- STEP 4: ENABLE RLS
-- =====================================================
ALTER TABLE mentor_startup_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_founded_startups ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: CREATE RLS POLICIES - SELECT
-- =====================================================

-- Mentor assignments: Mentors can view their own assignments
DROP POLICY IF EXISTS "Mentors can view their assignments" ON mentor_startup_assignments;
CREATE POLICY "Mentors can view their assignments" ON mentor_startup_assignments
    FOR SELECT USING (mentor_id = auth.uid());

-- Mentor assignments: Admins can view all
DROP POLICY IF EXISTS "Admins can view all mentor assignments" ON mentor_startup_assignments;
CREATE POLICY "Admins can view all mentor assignments" ON mentor_startup_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'Admin'
        )
    );

-- Mentor requests: Mentors can view requests to them
DROP POLICY IF EXISTS "Mentors can view their requests" ON mentor_requests;
CREATE POLICY "Mentors can view their requests" ON mentor_requests
    FOR SELECT USING (mentor_id = auth.uid());

-- Mentor requests: Requesters can view their own requests
DROP POLICY IF EXISTS "Requesters can view their requests" ON mentor_requests;
CREATE POLICY "Requesters can view their requests" ON mentor_requests
    FOR SELECT USING (requester_id = auth.uid());

-- Mentor requests: Admins can view all
DROP POLICY IF EXISTS "Admins can view all mentor requests" ON mentor_requests;
CREATE POLICY "Admins can view all mentor requests" ON mentor_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'Admin'
        )
    );

-- Mentor founded startups: Mentors can view their founded startups
DROP POLICY IF EXISTS "Mentors can view their founded startups" ON mentor_founded_startups;
CREATE POLICY "Mentors can view their founded startups" ON mentor_founded_startups
    FOR SELECT USING (mentor_id = auth.uid());

-- Mentor founded startups: Admins can view all
DROP POLICY IF EXISTS "Admins can view all mentor founded startups" ON mentor_founded_startups;
CREATE POLICY "Admins can view all mentor founded startups" ON mentor_founded_startups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'Admin'
        )
    );

-- =====================================================
-- STEP 6: CREATE RLS POLICIES - INSERT/UPDATE/DELETE
-- =====================================================

-- Mentor assignments: Mentors can insert their own assignments
DROP POLICY IF EXISTS "Mentors can insert their assignments" ON mentor_startup_assignments;
CREATE POLICY "Mentors can insert their assignments" ON mentor_startup_assignments
    FOR INSERT WITH CHECK (mentor_id = auth.uid());

-- Mentor assignments: Mentors can update their own assignments
DROP POLICY IF EXISTS "Mentors can update their assignments" ON mentor_startup_assignments;
CREATE POLICY "Mentors can update their assignments" ON mentor_startup_assignments
    FOR UPDATE USING (mentor_id = auth.uid());

-- Mentor assignments: Mentors can delete their own assignments
DROP POLICY IF EXISTS "Mentors can delete their assignments" ON mentor_startup_assignments;
CREATE POLICY "Mentors can delete their assignments" ON mentor_startup_assignments
    FOR DELETE USING (mentor_id = auth.uid());

-- Mentor requests: Mentors can update requests to them (accept/reject)
DROP POLICY IF EXISTS "Mentors can update their requests" ON mentor_requests;
CREATE POLICY "Mentors can update their requests" ON mentor_requests
    FOR UPDATE USING (mentor_id = auth.uid());

-- Mentor requests: Requesters can insert their own requests
DROP POLICY IF EXISTS "Requesters can insert their requests" ON mentor_requests;
CREATE POLICY "Requesters can insert their requests" ON mentor_requests
    FOR INSERT WITH CHECK (requester_id = auth.uid());

-- Mentor founded startups: Mentors can insert their founded startups
DROP POLICY IF EXISTS "Mentors can insert their founded startups" ON mentor_founded_startups;
CREATE POLICY "Mentors can insert their founded startups" ON mentor_founded_startups
    FOR INSERT WITH CHECK (mentor_id = auth.uid());

-- Mentor founded startups: Mentors can update their founded startups
DROP POLICY IF EXISTS "Mentors can update their founded startups" ON mentor_founded_startups;
CREATE POLICY "Mentors can update their founded startups" ON mentor_founded_startups
    FOR UPDATE USING (mentor_id = auth.uid());

-- Mentor founded startups: Mentors can delete their founded startups
DROP POLICY IF EXISTS "Mentors can delete their founded startups" ON mentor_founded_startups;
CREATE POLICY "Mentors can delete their founded startups" ON mentor_founded_startups
    FOR DELETE USING (mentor_id = auth.uid());

-- =====================================================
-- STEP 7: CREATE INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_mentor_startup_assignments_mentor_id ON mentor_startup_assignments(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_startup_assignments_startup_id ON mentor_startup_assignments(startup_id);
CREATE INDEX IF NOT EXISTS idx_mentor_startup_assignments_status ON mentor_startup_assignments(status);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_mentor_id ON mentor_requests(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_requester_id ON mentor_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_mentor_requests_status ON mentor_requests(status);
CREATE INDEX IF NOT EXISTS idx_mentor_founded_startups_mentor_id ON mentor_founded_startups(mentor_id);

-- =====================================================
-- STEP 8: VERIFY TABLES CREATED
-- =====================================================
SELECT 'Tables created successfully' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('mentor_startup_assignments', 'mentor_requests', 'mentor_founded_startups')
ORDER BY table_name;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. startup_id can be NULL for manually entered startups
-- 2. Manual startup details are stored in the 'notes' field as JSON:
--    {"startup_name": "...", "email_id": "...", "website": "...", "sector": "..."}
-- 3. The unique constraints only apply when startup_id IS NOT NULL
-- 4. Multiple entries with null startup_id are allowed (for manual entries)
-- =====================================================
