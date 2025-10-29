-- SAFE FIX: Keep both startup_id and investment_id
-- This approach doesn't break existing functionality

-- 1. Check current table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'investment_offers'
ORDER BY ordinal_position;

-- 2. Add investment_id column if it doesn't exist (keep startup_id)
ALTER TABLE investment_offers 
ADD COLUMN IF NOT EXISTS investment_id INTEGER;

-- 3. Add foreign key constraint for investment_id (keep startup_id constraint)
-- First check if constraint already exists, then add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'investment_offers_investment_id_fkey'
        AND table_name = 'investment_offers'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE investment_offers 
        ADD CONSTRAINT investment_offers_investment_id_fkey 
        FOREIGN KEY (investment_id) REFERENCES new_investments(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added investment_id foreign key constraint';
    ELSE
        RAISE NOTICE 'investment_id foreign key constraint already exists';
    END IF;
END $$;

-- 4. Update existing records to populate investment_id based on startup_name
UPDATE investment_offers 
SET investment_id = (
    SELECT ni.id 
    FROM new_investments ni 
    WHERE ni.name = investment_offers.startup_name
    LIMIT 1
)
WHERE investment_id IS NULL 
AND startup_name IS NOT NULL;

-- 5. Verify both foreign key constraints exist
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
    AND tc.table_name='investment_offers'
ORDER BY kcu.column_name;

-- 6. Show the updated table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'investment_offers'
ORDER BY ordinal_position;
