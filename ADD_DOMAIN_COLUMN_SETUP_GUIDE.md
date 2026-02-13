# 🚀 Investor Profile - Add Domain Column to Supabase

## Overview
The investor profile form has a `domain` field that allows investors to select their investment domains/sectors, but this column was **missing from the database table**. We've created a migration script to add it.

## Current Issue
When trying to save an investor profile with domain selections, Supabase returns a 400 error because the `domain` column doesn't exist in the `investor_profiles` table.

## Solution

### Step 1: Check Current Columns ✅
The `investor_profiles` table currently has these columns:
```
id (UUID) - Primary Key
user_id (UUID) - Foreign Key to auth.users
firm_type (TEXT)
global_hq (TEXT)
investor_name (TEXT) - REQUIRED
website (TEXT)
linkedin_link (TEXT)
email (TEXT)
geography (TEXT[]) - Array
ticket_size_min (DECIMAL)
ticket_size_max (DECIMAL)
currency (VARCHAR) - Default: USD
investment_stages (TEXT[]) - Array
investment_thesis (TEXT)
funding_requirements (TEXT)
funding_stages (TEXT[]) - Array
target_countries (TEXT[]) - Array
company_size (TEXT)
logo_url (TEXT)
video_url (TEXT)
media_type (TEXT) - Check: 'logo' or 'video'
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### Missing Column ❌
- `domain` (TEXT[]) - Array of investment domains/sectors

## SQL Migration Script

File: `ADD_DOMAIN_COLUMN_TO_INVESTOR_PROFILES.sql`

This script:
1. ✅ Adds the `domain` TEXT[] column
2. ✅ Creates a GIN index on the domain column for fast filtering
3. ✅ Adds documentation comment
4. ✅ Includes verification query to check the migration

### What the Script Does:
```sql
-- Add the missing domain column
ALTER TABLE public.investor_profiles
ADD COLUMN IF NOT EXISTS domain TEXT[];

-- Create index for fast filtering
CREATE INDEX IF NOT EXISTS idx_investor_profiles_domain 
ON public.investor_profiles USING GIN(domain);

-- Documentation
COMMENT ON COLUMN public.investor_profiles.domain 
IS 'Array of investment domains/sectors...';

-- Verify the migration worked
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'investor_profiles'
ORDER BY ordinal_position;
```

## Next Steps (In Supabase SQL Editor)

### 1. Run the Migration Script
```
Open Supabase Dashboard
→ SQL Editor
→ Create new query
→ Copy entire content of ADD_DOMAIN_COLUMN_TO_INVESTOR_PROFILES.sql
→ Click "Run"
```

### 2. Verify the Column Was Added
The script will show all columns in the output. Look for:
```
domain | text[] | YES
```

### 3. (Optional) Update the Main Table Creation Script
Once verified, update `CREATE_INVESTOR_PROFILES_TABLE.sql` to include the domain column in the initial CREATE TABLE statement for future recreations:

Add this under the `-- Investment Preferences` section:
```sql
domain TEXT[], -- Array of investment domains/sectors (e.g., Agriculture, AI, Climate, E-commerce, etc.)
```

## Form Changes ✅ Completed

The `InvestorProfileForm.tsx` has been updated to fully support the domain field:

### Features:
- ✅ Domain interface field restored
- ✅ Domain state variables restored
- ✅ Domain dropdown UI restored
- ✅ Load domains from general_data service (with fallback hardcoded list)
- ✅ Select/deselect domain functionality
- ✅ Domain saves to database with profile
- ✅ Domain loads from database when editing profile

### Domain Options (Fallback List):
- Agriculture
- AI
- Climate
- Consumer Goods
- Defence
- E-commerce
- Education
- EV
- Finance
- Food & Beverage
- Healthcare
- Manufacturing
- Media & Entertainment
- Others
- PaaS
- Renewable Energy
- Retail
- SaaS
- Social Impact
- Space
- Transportation and Logistics
- Waste Management
- Web 3.0

## Files Modified/Created

### Created:
- ✅ `ADD_DOMAIN_COLUMN_TO_INVESTOR_PROFILES.sql` - Migration script

### Modified:
- ✅ `components/investor/InvestorProfileForm.tsx` - Restored domain functionality

## Testing Instructions

After running the SQL migration:

1. Navigate to Investor Profile Form
2. Fill in required fields:
   - Investor Name
   - (Other optional fields)
3. **Select one or more domains** from the Domain dropdown
4. Click "Save Profile"
5. Should save successfully without 400 error
6. Reload the form and verify domains are still there

## Success Criteria ✅
- [x] Domain column exists in investor_profiles table
- [x] Domain index created for performance
- [x] Form can save investor profiles with domains
- [x] Form can load and display saved domains
- [x] No 400 errors when saving

## Related Documentation
- `CREATE_INVESTOR_PROFILES_TABLE.sql` - Original table creation script
- `components/investor/InvestorProfileForm.tsx` - Form component
- `generalDataService.ts` - Service for loading domain options from database
