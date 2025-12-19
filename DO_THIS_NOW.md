# 🚀 DO THIS NOW - Step-by-Step Migration Guide

Follow these steps **in order**. Do NOT skip any step!

---

## ✅ STEP 0: CHECK IF MIGRATION IS ALREADY DONE (2 minutes)

**If you already migrated before, check current status first!**

1. **Open Supabase SQL Editor:**
   - Go to Supabase Dashboard → SQL Editor
   - Click "New Query"

2. **Run Check Script:**
   - Copy entire contents of `CHECK_CURRENT_MIGRATION_STATUS.sql`
   - Paste into SQL Editor
   - Click "Run"

3. **Read Results:**
   - Look at the summary at the end
   - ✅ If you see "already migrated" → **You're done! Skip to STEP 5 (Testing)**
   - ❌ If you see "NEED MIGRATION" → Continue with STEP 1 below

---

## ✅ STEP 1: Backup Database (5 minutes) - REQUIRED!

**Only do this if STEP 0 shows you need migration.**

### Option A: Supabase Dashboard (Easiest - Recommended)

1. **Open Supabase Dashboard:**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Create Backup:**
   - Click **"Database"** in left sidebar
   - Click **"Backups"** tab
   - Click **"Create Backup"** or **"Download Backup"** button
   - Wait for backup to complete (usually 1-2 minutes)

3. **Save Backup File:**
   - Download the backup file
   - Save it as: `backup_before_user_profiles_migration_2024-12-19.sql` (use today's date)
   - Store it safely (cloud + local computer)

4. **Verify Backup:**
   - Check file size > 0 bytes
   - Open file and verify it contains SQL statements
   - ✅ **Done! Backup is complete**

### Option B: If Dashboard Backup Doesn't Work
- Use pg_dump (see BACKUP_AND_ROLLBACK_GUIDE.md)
- Or use Supabase CLI

**⚠️ DO NOT PROCEED TO STEP 2 UNTIL BACKUP IS COMPLETE!**

---

## ✅ STEP 2: Backfill user_profiles (2 minutes)

1. **Open Supabase SQL Editor:**
   - Go to Supabase Dashboard → SQL Editor
   - Click "New Query"

2. **Run Backfill Script:**
   - Copy entire contents of `BACKFILL_USER_PROFILES_BEFORE_MIGRATION.sql`
   - Paste into SQL Editor
   - Click "Run" or press F5

3. **Check Output:**
   - Look for: `✅ SUCCESS: All users have matching user_profiles rows`
   - If you see warnings, read them but usually OK to proceed
   - ✅ **Done! All users now have user_profiles rows**

---

## ✅ STEP 3: Run Safe Migration (5 minutes)

1. **In Supabase SQL Editor:**
   - Click "New Query" (or clear previous query)

2. **Run Migration Script:**
   - Copy entire contents of `SAFE_MIGRATION_TO_USER_PROFILES.sql`
   - Paste into SQL Editor
   - Click "Run" or press F5

3. **Check Output:**
   - Review all messages - look for warnings or errors
   - Should see: `✅ Added FK constraint: ...` messages for each table
   - At the end, should see: `✅ Migration Complete` with list of FKs
   - ✅ **Done! Foreign keys now point to user_profiles**

---

## ✅ STEP 4: Update SQL Functions (2 minutes)

1. **Update Investment Offer Function:**
   - Open new query in SQL Editor
   - Copy `UPDATE_CREATE_INVESTMENT_OFFER_FUNCTION_FOR_CO_INVESTMENT.sql`
   - Paste and run
   - Should see: `CREATE FUNCTION` success message

2. **Update Co-Investment Function:**
   - Open new query
   - Copy the function part from `CREATE_CO_INVESTMENT_OFFERS_TABLE.sql`
   - (Only the `CREATE OR REPLACE FUNCTION create_co_investment_offer...` part)
   - Paste and run

3. **Update Trigger Function:**
   - Open new query
   - Copy `UPDATE_LEAD_INVESTOR_TRIGGER_FOR_USER_PROFILES.sql`
   - Paste and run

   - ✅ **Done! Functions now use user_profiles only**

---

## ✅ STEP 5: Test Your Application (10 minutes)

### Test These Flows:

1. **Login Test:**
   - [ ] Existing user can login
   - [ ] Dashboard loads correctly

2. **Investor Test:**
   - [ ] Investor dashboard loads
   - [ ] Can view startups
   - [ ] Can submit investment offer
   - [ ] Offer appears in "My Offers" section

3. **Advisor Test:**
   - [ ] Advisor dashboard loads
   - [ ] Can see investor offers for approval
   - [ ] Can approve/reject offers

4. **Co-Investment Test:**
   - [ ] Can create co-investment opportunity
   - [ ] Can view co-investment opportunities
   - [ ] Can submit co-investment offers

5. **Startup Test:**
   - [ ] Startup dashboard loads
   - [ ] Can view investment offers
   - [ ] Can accept/reject offers

### If All Tests Pass:
- ✅ **Migration is SUCCESSFUL!**
- ✅ You're done!
- Keep backup file for at least 30 days

### If Any Test Fails:
- See "TROUBLESHOOTING" section below

---

## 🚨 IF SOMETHING BREAKS - Rollback Steps

### Quick Rollback (Choose One):

**Option 1: Restore from Backup (Safest)**
1. Go to Supabase Dashboard → Database → Backups
2. Find your backup file
3. Click "Restore" button
4. Confirm restoration
5. Everything returns to before migration

**Option 2: Run Rollback Script**
1. Open SQL Editor
2. Copy `ROLLBACK_MIGRATION_TO_USERS.sql`
3. Paste and run
4. This reverts foreign keys back to `users` table
5. Then you may need to restore code changes too

---

## 🐛 TROUBLESHOOTING

### Error: "foreign key constraint violation"
**Fix:** Some data might be missing. Check the error message - it will tell you which table/ID is missing.

**Solution:**
1. Run backfill script again (STEP 2)
2. Check if all users exist in user_profiles:
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM user_profiles;
   -- Should be same or user_profiles should have more
   ```

### Error: "relation user_profiles does not exist"
**Fix:** user_profiles table doesn't exist yet.

**Solution:**
- You need to create user_profiles table first
- Check if you have migration scripts that create the table
- Or use existing table creation scripts

### Queries return empty results
**Fix:** RLS (Row Level Security) might be blocking access.

**Solution:**
- Check RLS policies on user_profiles table
- Verify auth.uid() matches user_profiles.auth_user_id
- Temporary: Check RLS is not too restrictive

### "Cannot add FK constraint" error
**Fix:** Some IDs don't exist in user_profiles.

**Solution:**
1. Find which IDs are missing:
   ```sql
   -- Example for investment_offers
   SELECT DISTINCT investor_id 
   FROM investment_offers 
   WHERE investor_id NOT IN (SELECT auth_user_id FROM user_profiles);
   ```
2. Create missing user_profiles rows
3. Run migration again

---

## 📋 Summary Checklist

- [ ] ✅ STEP 1: Backup created and saved
- [ ] ✅ STEP 2: Backfill script run successfully
- [ ] ✅ STEP 3: Migration script run successfully
- [ ] ✅ STEP 4: SQL functions updated
- [ ] ✅ STEP 5: All tests pass
- [ ] ✅ Backup file kept safe

---

## ✅ YOU'RE DONE!

If all steps completed successfully and tests pass:
- Migration is complete! 🎉
- Your system now uses user_profiles for all foreign keys
- New user registrations will work correctly
- Keep backup for 30 days minimum

---

## 📞 Need Help?

If you encounter issues:
1. Check error messages carefully
2. Review TROUBLESHOOTING section above
3. Check Supabase logs
4. Use rollback if critical issues occur
5. Fix issues and retry migration

**Remember:** You have a backup, so you can always restore if needed!

