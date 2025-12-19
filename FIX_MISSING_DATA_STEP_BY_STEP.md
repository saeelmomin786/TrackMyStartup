# Fix Missing Data - Step by Step

Since check shows "SOME DATA MISSING", here's what to do:

---

## STEP 1: Create Missing User Profiles (2 minutes)

1. **Open:** Supabase SQL Editor → New Query

2. **Copy and run:** `BACKFILL_USER_PROFILES_SAFE.sql`
   - This creates missing profiles for users that don't have them
   - Only uses basic fields (safe, won't error on missing columns)

3. **Verify:** Run `CHECK_IF_BACKFILL_NEEDED.sql` again
   - Should now show: `✅ SKIP BACKFILL - All users already have profiles`

---

## STEP 2: Verify Data Again (1 minute)

1. **Run:** `CHECK_ALL_DATA_AND_PROFILES.sql` again

2. **Check Final Summary:**
   - Should now show: `✅ ALL DATA IS READY`
   - If still shows "SOME DATA MISSING", share the individual check results

---

## STEP 3: After Data is Ready - Proceed to Migration

Once `CHECK_ALL_DATA_AND_PROFILES.sql` shows "✅ ALL DATA IS READY":

1. **Run:** `SAFE_MIGRATION_TO_USER_PROFILES.sql` (Step 3 from migration guide)
2. **Update functions** (Step 4)
3. **Test app** (Step 5)

---

## What the Backfill Fixes

The backfill script creates `user_profiles` rows for:
- Users that exist in `users` table but don't have a profile in `user_profiles`
- This ensures all IDs in `investment_offers`, `startups`, etc. can find a matching profile

**This is safe because:**
- ✅ Only creates new rows (doesn't modify existing)
- ✅ Uses only basic fields (won't error on missing columns)
- ✅ Skips users that already have profiles

