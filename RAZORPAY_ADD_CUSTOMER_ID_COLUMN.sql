-- Ensure users table has a Razorpay customer id column for mandate cleanup / linkage
-- Safe to run multiple times

ALTER TABLE users
ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT;

-- Optional index if you expect lookups by customer id
CREATE INDEX IF NOT EXISTS idx_users_razorpay_customer_id ON users(razorpay_customer_id);











