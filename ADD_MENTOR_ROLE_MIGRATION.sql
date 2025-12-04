-- =====================================================
-- SAFE MIGRATION: ADD MENTOR ROLE TO USER_ROLE ENUM
-- =====================================================
-- This script safely adds 'Mentor' to the user_role enum
-- It's safe to run on a live database as it checks if the value exists first
-- Run this in your Supabase SQL Editor

-- Step 1: Check current enum values
SELECT 'Current user_role enum values:' as info;
SELECT 
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'user_role'
ORDER BY e.enumsortorder;

-- Step 2: Add 'Mentor' to user_role enum if it doesn't exist
DO $$ 
BEGIN
    -- Check if 'Mentor' already exists in the enum
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'Mentor' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'user_role'
        )
    ) THEN
        -- Add 'Mentor' to the enum
        ALTER TYPE user_role ADD VALUE 'Mentor';
        RAISE NOTICE 'Successfully added ''Mentor'' to user_role enum';
    ELSE
        RAISE NOTICE '''Mentor'' already exists in user_role enum';
    END IF;
END $$;

-- Step 3: Verify the enum value was added
SELECT 'Updated user_role enum values:' as info;
SELECT 
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'user_role'
ORDER BY e.enumsortorder;

-- Step 4: Create helper function to check if user is a mentor
CREATE OR REPLACE FUNCTION is_mentor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() = 'Mentor';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Verify the function was created
SELECT 'Helper function created: is_mentor()' as info;

-- =====================================================
-- NOTE: After running this script, you'll need to:
-- 1. Update TypeScript types (types.ts)
-- 2. Create MentorView component
-- 3. Update App.tsx routing
-- 4. Update RLS policies (see ADD_MENTOR_RLS_POLICIES.sql)
-- =====================================================

