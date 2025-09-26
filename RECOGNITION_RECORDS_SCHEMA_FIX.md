# Recognition Records Schema Fix

## Problem
The recognition records form is failing with the error:
```
Could not find the 'investment_amount' column of 'recognition_records' in the schema cache
```

## Root Cause
The `recognition_records` table in your Supabase database is missing several columns that the application code expects. The service is trying to insert data with these columns:
- `shares`
- `price_per_share` 
- `investment_amount`
- `post_money_valuation`

But the current database schema only has:
- `fee_amount`
- `equity_allocated`
- `pre_money_valuation`

## Solution
You need to add the missing columns to your `recognition_records` table in Supabase.

### Step 1: Run the SQL Script
1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the following SQL script:

```sql
-- Add missing columns to recognition_records table
-- This script adds the columns that are being used in the service but missing from the schema

-- Add shares column
ALTER TABLE public.recognition_records 
ADD COLUMN IF NOT EXISTS shares INTEGER;

-- Add price_per_share column
ALTER TABLE public.recognition_records 
ADD COLUMN IF NOT EXISTS price_per_share DECIMAL(15,2);

-- Add investment_amount column
ALTER TABLE public.recognition_records 
ADD COLUMN IF NOT EXISTS investment_amount DECIMAL(15,2);

-- Add post_money_valuation column
ALTER TABLE public.recognition_records 
ADD COLUMN IF NOT EXISTS post_money_valuation DECIMAL(15,2);

-- Create indexes for the new columns for better performance
CREATE INDEX IF NOT EXISTS idx_recognition_records_investment_amount 
ON public.recognition_records(investment_amount);

CREATE INDEX IF NOT EXISTS idx_recognition_records_post_money_valuation 
ON public.recognition_records(post_money_valuation);

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'recognition_records' 
AND column_name IN ('shares', 'price_per_share', 'investment_amount', 'post_money_valuation')
ORDER BY column_name;
```

### Step 2: Verify the Fix
After running the SQL script, you should see the new columns in the verification query results. The table should now have all the required columns.

### Step 3: Test the Form
1. Go back to your application
2. Try submitting a recognition record form again
3. The form should now work without the schema error

## Alternative: Use the Provided SQL File
I've also created a file `ADD_MISSING_COLUMNS_TO_RECOGNITION_RECORDS.sql` in your project directory that contains the same SQL script. You can copy the contents of that file and run it in your Supabase SQL Editor.

## What This Fixes
- ✅ Recognition records can now be created with investment amounts
- ✅ Share-based recognition records will work properly
- ✅ Post-money valuation tracking is now supported
- ✅ Price per share calculations are now stored
- ✅ All recognition form fields will save correctly

## Expected Behavior After Fix
Once you run the SQL script, the recognition form should:
1. Accept all form inputs including investment amounts and share details
2. Successfully upload agreement files
3. Save the recognition record to the database
4. Display the new record in the recognition records list
5. Trigger the auto-calculation features for equity distribution
<<<<<<< HEAD

=======
>>>>>>> aba79bbb99c116b96581e88ab62621652ed6a6b7
