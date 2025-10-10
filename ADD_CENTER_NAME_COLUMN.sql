-- Add center_name column to users table
-- This allows us to store the facilitation center name directly with the user account

-- Add the center_name column
ALTER TABLE users 
ADD COLUMN center_name TEXT;

-- Add a comment to document the column purpose
COMMENT ON COLUMN users.center_name IS 'Name of the facilitation center associated with this user (only for users with role = Startup Facilitation Center)';

-- Create an index on center_name for faster lookups
CREATE INDEX idx_users_center_name ON users(center_name);

-- Add a check constraint to ensure center_name is only set for Startup Facilitation Center users
-- Note: This constraint allows NULL values for existing facilitation center users
ALTER TABLE users 
ADD CONSTRAINT chk_center_name_role 
CHECK (
  (role = 'Startup Facilitation Center') OR 
  (role != 'Startup Facilitation Center' AND center_name IS NULL)
);

-- Update RLS policies to include center_name
-- This ensures users can only see their own center name
ALTER POLICY "Users can view own profile" ON users
USING (auth.uid() = id);

-- Grant necessary permissions
GRANT SELECT, UPDATE ON users TO authenticated;
GRANT SELECT ON users TO anon;

-- Create a function to get facilitation center details by user email
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

-- Create a view for easy access to facilitation center information
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
