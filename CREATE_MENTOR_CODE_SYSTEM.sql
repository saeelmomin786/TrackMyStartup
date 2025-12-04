-- =====================================================
-- MENTOR CODE SYSTEM IMPLEMENTATION
-- =====================================================
-- This script implements unique mentor codes for mentors
-- Similar to facilitator codes and investment advisor codes
-- =====================================================

-- 1. Add mentor_code column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'mentor_code'
    ) THEN
        ALTER TABLE users ADD COLUMN mentor_code VARCHAR(10) UNIQUE;
        RAISE NOTICE 'Added mentor_code column to users table';
    ELSE
        RAISE NOTICE 'mentor_code column already exists';
    END IF;
END $$;

-- 2. Create function to generate unique mentor codes
CREATE OR REPLACE FUNCTION generate_mentor_code()
RETURNS VARCHAR(10) AS $$
DECLARE
    new_code VARCHAR(10);
    code_exists BOOLEAN;
    attempts INTEGER := 0;
    max_attempts INTEGER := 100;
BEGIN
    LOOP
        -- Generate a random 6-character code with MEN- prefix
        new_code := 'MEN-' || upper(substring(md5(random()::text) from 1 for 6));
        
        -- Check if code already exists
        SELECT EXISTS(
            SELECT 1 FROM users WHERE mentor_code = new_code
        ) INTO code_exists;
        
        -- If code doesn't exist, return it
        IF NOT code_exists THEN
            RETURN new_code;
        END IF;
        
        -- Prevent infinite loop
        attempts := attempts + 1;
        IF attempts >= max_attempts THEN
            RAISE EXCEPTION 'Could not generate unique mentor code after % attempts', max_attempts;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Create function to assign mentor code to user
CREATE OR REPLACE FUNCTION assign_mentor_code(p_user_id UUID)
RETURNS VARCHAR(10) AS $$
DECLARE
    new_code VARCHAR(10);
    user_role TEXT;
BEGIN
    -- Check if user is a mentor
    SELECT role INTO user_role FROM users WHERE id = p_user_id;
    
    IF user_role != 'Mentor' THEN
        RAISE EXCEPTION 'User is not a Mentor';
    END IF;
    
    -- Check if user already has a code
    IF EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND mentor_code IS NOT NULL) THEN
        SELECT mentor_code INTO new_code FROM users WHERE id = p_user_id;
        RETURN new_code;
    END IF;
    
    -- Generate and assign new code
    new_code := generate_mentor_code();
    UPDATE users SET mentor_code = new_code WHERE id = p_user_id;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to auto-generate mentor code on user creation/update
CREATE OR REPLACE FUNCTION set_mentor_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set code for Mentor role
    IF NEW.role = 'Mentor' AND (NEW.mentor_code IS NULL OR NEW.mentor_code = '') THEN
        NEW.mentor_code := generate_mentor_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_mentor_code ON users;

-- Create trigger
CREATE TRIGGER trigger_set_mentor_code
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_mentor_code();

-- 5. Assign codes to existing mentors who don't have one
DO $$
DECLARE
    mentor_record RECORD;
    new_code VARCHAR(10);
BEGIN
    FOR mentor_record IN 
        SELECT id FROM users 
        WHERE role = 'Mentor' 
        AND (mentor_code IS NULL OR mentor_code = '')
    LOOP
        new_code := assign_mentor_code(mentor_record.id);
        RAISE NOTICE 'Assigned mentor code % to user %', new_code, mentor_record.id;
    END LOOP;
END $$;

-- 6. Verify the setup
SELECT 
    'Mentor Code System Setup Complete' as status,
    COUNT(*) FILTER (WHERE role = 'Mentor' AND mentor_code IS NOT NULL) as mentors_with_codes,
    COUNT(*) FILTER (WHERE role = 'Mentor') as total_mentors
FROM users;

-- 7. Show sample mentor codes
SELECT 
    id,
    name,
    email,
    role,
    mentor_code
FROM users
WHERE role = 'Mentor'
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. Mentor codes are automatically generated when a user's role is set to 'Mentor'
-- 2. Codes follow the format: MEN-XXXXXX (6 random characters)
-- 3. Codes are unique across all mentors
-- 4. Existing mentors without codes will be assigned codes automatically
-- 5. The code can be displayed in the mentor dashboard for sharing
-- =====================================================


