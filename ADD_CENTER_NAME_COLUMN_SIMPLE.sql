-- Add center_name column to users table (SIMPLE VERSION)
-- This version avoids RLS policy issues

-- Step 1: Add the center_name column (allows NULL initially)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS center_name TEXT;

-- Step 2: Add a comment to document the column purpose
COMMENT ON COLUMN users.center_name IS 'Name of the facilitation center associated with this user (only for users with role = Startup Facilitation Center)';

-- Step 3: Create an index on center_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_center_name ON users(center_name);

-- Step 4: Update existing facilitation center users to have a default center name
-- This prevents constraint violations for existing users
UPDATE users 
SET center_name = COALESCE(company, name || ' Center')
WHERE role = 'Startup Facilitation Center' 
AND center_name IS NULL;

-- Step 5: Add a check constraint that's more flexible
-- This allows NULL values for existing users but enforces the rule for new data
ALTER TABLE users 
ADD CONSTRAINT chk_center_name_role 
CHECK (
  (role = 'Startup Facilitation Center') OR 
  (role != 'Startup Facilitation Center' AND center_name IS NULL)
);

-- Step 6: Grant necessary permissions
GRANT SELECT, UPDATE ON users TO authenticated;
GRANT SELECT ON users TO anon;

-- Step 7: Create a function to get facilitation center details by user email
CREATE OR REPLACE FUNCTION get_center_by_user_email(user_email TEXT)
RETURNS TABLE (
  user_id TEXT,
  center_name TEXT,
  user_name TEXT,
  email TEXT,
  registration_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.center_name,
    u.name,
    u.email,
    u.registration_date::DATE
  FROM users u
  WHERE u.email = user_email AND u.role = 'Startup Facilitation Center';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_center_by_user_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_center_by_user_email(TEXT) TO anon;

-- Step 8: Create a view for easy access to facilitation center information
CREATE OR REPLACE VIEW user_center_info AS
SELECT 
  u.id,
  u.email,
  u.name as user_name,
  u.center_name,
  u.role,
  u.registration_date,
  u.created_at,
  u.updated_at
FROM users u
WHERE u.role = 'Startup Facilitation Center';

-- Grant permissions on the view
GRANT SELECT ON user_center_info TO authenticated;
GRANT SELECT ON user_center_info TO anon;

-- Add comment to the view
COMMENT ON VIEW user_center_info IS 'View for accessing facilitation center information by user';

-- Step 9: Verify the changes
SELECT 
  'Migration completed successfully' as status,
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = 'Startup Facilitation Center' THEN 1 END) as facilitation_centers,
  COUNT(CASE WHEN role = 'Startup Facilitation Center' AND center_name IS NOT NULL THEN 1 END) as centers_with_names
FROM users;
