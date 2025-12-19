# Complete Migration to user_profiles Table

## Overview
This migration shifts all foreign key references from `public.users` to `public.user_profiles` table, completing the migration to the multi-profile system.

## Files Created/Modified

### 1. SQL Migration Script
**File:** `MIGRATE_TO_USER_PROFILES_COMPLETE.sql`

This script updates foreign keys for:
- `investment_offers.investor_id` → `user_profiles.auth_user_id`
- `co_investment_offers.investor_id` → `user_profiles.auth_user_id`
- `startups.user_id` → `user_profiles.auth_user_id`
- `advisor_mandates.advisor_id` → `user_profiles.auth_user_id`
- `advisor_startup_link_requests.advisor_id` → `user_profiles.auth_user_id`
- `advisor_startup_link_requests.startup_user_id` → `user_profiles.auth_user_id`
- `investor_connection_requests.investor_id` → `user_profiles.auth_user_id`
- `investor_connection_requests.requester_id` → `user_profiles.auth_user_id`
- `advisor_connection_requests.advisor_id` → `user_profiles.auth_user_id`
- `advisor_connection_requests.requester_id` → `user_profiles.auth_user_id`
- `collaborator_recommendations.sender_user_id` → `user_profiles.auth_user_id`
- `collaborator_recommendations.collaborator_user_id` → `user_profiles.auth_user_id`
- `co_investment_opportunities.listed_by_user_id` → `user_profiles.auth_user_id`
- `investor_favorites.investor_id` → `user_profiles.auth_user_id` (if exists)
- `verification_requests.user_id` → `user_profiles.auth_user_id` (if exists)

### 2. SQL Functions Updated
**Files:**
- `UPDATE_CREATE_INVESTMENT_OFFER_FUNCTION_FOR_CO_INVESTMENT.sql`
- `CREATE_CO_INVESTMENT_OFFERS_TABLE.sql`

**Changes:** Removed fallback to `users` table, now only uses `user_profiles`.

### 3. Code Updates

#### lib/database.ts
- Updated `handleInvestmentFlow()` to join with `user_profiles` instead of `users`
- Updated co-investment opportunity queries to use `user_profiles`

#### components/InvestorView.tsx
- Updated co-investment offer queries to use `user_profiles` instead of `users`
- Updated `auth_user_id` field name instead of `id`

#### components/startup-health/StartupDashboardTab.tsx
- Updated co-investment offer queries to use `user_profiles`

## Steps to Execute Migration

### Step 0: BACKUP DATABASE (CRITICAL!)
**⚠️ MUST DO THIS FIRST!**

See `BACKUP_AND_ROLLBACK_GUIDE.md` for detailed instructions.

**Quick Backup Options:**

**Option 1: Supabase Dashboard (Easiest)**
1. Go to Supabase Dashboard → Database → Backups
2. Click "Create Backup" or "Download Backup"
3. Save file: `backup_before_user_profiles_migration_YYYY-MM-DD.sql`

**Option 2: pg_dump**
```bash
pg_dump "your-connection-string" -f backup_before_migration.sql
```

**Why Backup?**
- If migration fails, you can restore from backup
- Takes 2-5 minutes, saves hours of fixing
- **Do NOT skip this step!**

### Step 1: Backfill user_profiles (REQUIRED FIRST)
**File:** `BACKFILL_USER_PROFILES_BEFORE_MIGRATION.sql`

Run this FIRST to ensure all users have corresponding rows in `user_profiles`:

```sql
This script creates `user_profiles` rows for all existing users that don't have them yet.

**Why this is needed:** The migration will fail if foreign keys reference IDs that don't exist in `user_profiles`.

### Step 2: Run SAFE Migration Script
**File:** `SAFE_MIGRATION_TO_USER_PROFILES.sql` (use this instead of the complete version)

Execute `SAFE_MIGRATION_TO_USER_PROFILES.sql` in Supabase SQL Editor.

**This safe version:**
- ✅ Verifies data before migrating
- ✅ Only updates IDs that don't exist in user_profiles
- ✅ Preserves existing working data
- ✅ Checks for errors before adding foreign key constraints
- ✅ Raises warnings if data issues are found

**OR use:** `MIGRATE_TO_USER_PROFILES_COMPLETE.sql` (original version, less safe)

### Step 3: Update SQL Functions
Re-run:
- `UPDATE_CREATE_INVESTMENT_OFFER_FUNCTION_FOR_CO_INVESTMENT.sql`
- `CREATE_CO_INVESTMENT_OFFERS_TABLE.sql` (just the function part, table already exists)

### Step 4: Test Critical Flows

## If Something Breaks: Rollback Procedure

### Option 1: Restore from Backup (Safest)
1. Go to Supabase Dashboard → Database → Backups
2. Find your backup file
3. Click "Restore" or restore manually

### Option 2: Run Rollback Script
**File:** `ROLLBACK_MIGRATION_TO_USERS.sql`

This script reverts all foreign keys back to `users` table.

**After rollback:**
- Restore code changes (revert lib/database.ts, components)
- Restore SQL function changes
- Test all flows
- Investigate why migration failed before trying again

### Option 3: Fix Issues and Continue
If only minor issues:
1. Fix the specific problem
2. Continue with migration
3. Don't rollback if fix is simple
1. **Investor offer submission** - new investors should be able to submit offers
2. **Advisor dashboard** - should show offers from investors
3. **Co-investment flows** - should work for new users
4. **Startup creation** - should work for new users

## Will This Break Existing Flows?

**Short answer: NO, if you follow the safe migration steps.**

### Why It's Safe:
1. **IDs are the same:** `user_profiles.auth_user_id` = `users.id` = `auth.uid()` - the values don't change
2. **FKs just point elsewhere:** We're changing which table the foreign key references, not the actual ID values
3. **Existing data preserved:** The safe migration script only updates IDs that are missing from user_profiles
4. **Backward compatible:** The `users` table stays intact, just not used for FKs anymore

### What Could Break (and how we prevent it):
- **Issue:** Foreign keys reference IDs not in `user_profiles`
  - **Fix:** Run `BACKFILL_USER_PROFILES_BEFORE_MIGRATION.sql` first
- **Issue:** Code still queries `users` table directly
  - **Note:** This will still work! The `users` table remains, we just don't use it for FKs
  - **Future:** Gradually update queries to use `user_profiles`

### Working Flows That Will Continue Working:
✅ Investor offer submission (now works for new investors too!)  
✅ Advisor dashboard (will show all investor offers)  
✅ Co-investment flows  
✅ Startup creation  
✅ All existing user logins  

### New Flows That Will Now Work:
✅ New investor registrations can submit offers  
✅ New advisor registrations can see their investors  

## Important Notes

### Foreign Key Constraint Names
Supabase uses FK constraint names in join syntax like:
```typescript
investor:user_profiles!investment_offers_investor_id_fkey(auth_user_id, name, email)
```

The constraint name stays the same (e.g., `investment_offers_investor_id_fkey`), but it now points to `user_profiles(auth_user_id)` instead of `users(id)`.

### Field Name Changes
- `users.id` → `user_profiles.auth_user_id`
- When querying, use `auth_user_id` instead of `id`

### Backward Compatibility
The `users` table will still exist for now, but:
- New foreign keys point to `user_profiles`
- All new queries should use `user_profiles`
- Old `users` table can eventually be deprecated

## What's Still TODO (Future Work)

### 1. Update All Service Files
Many service files still query `users` table. These should be updated to use `user_profiles`:
- `lib/investorService.ts`
- `lib/advisorService.ts`
- `lib/mentorService.ts`
- `lib/startupService.ts`
- And others...

### 2. Update RLS Policies
RLS policies that check `users.id = auth.uid()` should be updated to check `user_profiles.auth_user_id = auth.uid()`.

### 3. Update Trigger Functions
Triggers that populate data from `users` should be updated to use `user_profiles`.

### 4. Deprecate users Table (Eventually)
Once all code is migrated and tested, the `users` table can be deprecated.

## Troubleshooting

### Error: "foreign key constraint violation"
- Ensure all referenced IDs exist in `user_profiles` with matching `auth_user_id`
- Run the backfill script from Step 2

### Error: "relation user_profiles does not exist"
- Ensure `user_profiles` table exists
- Check table name (should be `public.user_profiles`)

### Queries return empty results
- Check RLS policies on `user_profiles`
- Verify `auth_user_id` values match `auth.uid()`

