-- =====================================================
-- FIX SUBSCRIPTION_CHANGES FOREIGN KEY
-- =====================================================
-- The subscription_changes table currently references auth.users(id)
-- But the code inserts profile_id from user_subscriptions
-- This causes foreign key constraint violation
--
-- Fix: Change the foreign key to reference user_profiles(id) instead

-- 1. Drop the problematic foreign key constraint
ALTER TABLE subscription_changes 
DROP CONSTRAINT IF EXISTS subscription_changes_user_id_fkey;

-- 2. Add the correct foreign key referencing user_profiles
ALTER TABLE subscription_changes 
ADD CONSTRAINT subscription_changes_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES user_profiles(id) 
ON DELETE CASCADE;

-- Verify the constraint was created
SELECT constraint_name, table_name, column_name
FROM information_schema.key_column_usage
WHERE table_name = 'subscription_changes'
AND column_name = 'user_id';
