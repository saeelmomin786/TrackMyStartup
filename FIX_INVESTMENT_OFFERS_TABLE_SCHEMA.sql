-- Fix investment_offers table to use investment_id instead of startup_id
-- This will resolve the foreign key constraint error

-- 1. First, let's check the current table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'investment_offers'
ORDER BY ordinal_position;

-- 2. Drop the existing foreign key constraint for startup_id
ALTER TABLE investment_offers 
DROP CONSTRAINT IF EXISTS investment_offers_startup_id_fkey;

-- 3. Add investment_id column if it doesn't exist
ALTER TABLE investment_offers 
ADD COLUMN IF NOT EXISTS investment_id INTEGER;

-- 4. Add foreign key constraint to reference new_investments
ALTER TABLE investment_offers 
ADD CONSTRAINT investment_offers_investment_id_fkey 
FOREIGN KEY (investment_id) REFERENCES new_investments(id) ON DELETE CASCADE;

-- 5. Update existing records to use investment_id instead of startup_id
-- We'll need to map startup_id to the corresponding new_investments.id
-- Since there's no direct relationship, we'll use the name matching approach
UPDATE investment_offers 
SET investment_id = (
    SELECT ni.id 
    FROM new_investments ni 
    WHERE ni.name = investment_offers.startup_name
    LIMIT 1
)
WHERE investment_id IS NULL;

-- 6. Make investment_id NOT NULL after populating it
ALTER TABLE investment_offers 
ALTER COLUMN investment_id SET NOT NULL;

-- 7. Drop the startup_id column since we're using investment_id now
ALTER TABLE investment_offers 
DROP COLUMN IF EXISTS startup_id;

-- 8. Verify the changes
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='investment_offers';

-- 9. Show the updated table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'investment_offers'
ORDER BY ordinal_position;



