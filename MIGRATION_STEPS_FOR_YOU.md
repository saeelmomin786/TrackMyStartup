# Your Migration Steps (Status: NEEDED)

Since check shows migration is needed, follow these steps:

---

## ✅ STEP 1: BACKUP DATABASE (5 minutes) - DO THIS FIRST!

### In Supabase Dashboard:

1. Go to: **Supabase Dashboard** → **Database** → **Backups** tab
2. Click: **"Create Backup"** or **"Download Backup"** button
3. Wait: 1-2 minutes for backup to complete
4. Download: Save file as `backup_before_migration_2024-12-19.sql` (use today's date)
5. Verify: Check file size > 0 bytes

**⚠️ DO NOT SKIP THIS! If something breaks, you can restore from this backup.**

---

## ✅ STEP 2: Backfill user_profiles (2 minutes)

1. **Open:** Supabase Dashboard → SQL Editor → New Query

2. **Copy and paste** entire `BACKFILL_USER_PROFILES_BEFORE_MIGRATION.sql` file

3. **Click "Run"** (or press F5)

4. **Check output:**
   - Should see: `✅ SUCCESS: All users have matching user_profiles rows`
   - If you see warnings, usually OK to proceed

---

## ✅ STEP 3: Run Safe Migration (5 minutes)

1. **In SQL Editor:** New Query

2. **Copy and paste** entire `SAFE_MIGRATION_TO_USER_PROFILES.sql` file

3. **Click "Run"**

4. **Check output carefully:**
   - Look for: `✅ Added FK constraint: ...` messages
   - Should see: `✅ Migration Complete` at the end
   - **If you see errors, STOP and let me know**

---

## ✅ STEP 4: Update SQL Functions (3 minutes)

Run these one by one in SQL Editor (each in a new query):

### 4.1: Update Investment Offer Function
- Copy entire `UPDATE_CREATE_INVESTMENT_OFFER_FUNCTION_FOR_CO_INVESTMENT.sql`
- Paste and run

### 4.2: Update Co-Investment Function
- Open `CREATE_CO_INVESTMENT_OFFERS_TABLE.sql`
- Find the function `create_co_investment_offer` (starts around line 78)
- Copy just that function (from `CREATE OR REPLACE FUNCTION` to `$$;`)
- Paste and run

### 4.3: Update Trigger Function
- Copy entire `UPDATE_LEAD_INVESTOR_TRIGGER_FOR_USER_PROFILES.sql`
- Paste and run

---

## ✅ STEP 5: Verify Migration (2 minutes)

1. **Run the check again:**
   - Copy `QUICK_STATUS_CHECK.sql`
   - Paste and run in SQL Editor
   - Should now show: `✅ MIGRATION ALREADY DONE`

2. **If still shows "NEED MIGRATION":**
   - Check error messages from Step 3
   - Let me know what errors you see

---

## ✅ STEP 6: Test Your Application (10 minutes)

### Test These Flows:

- [ ] **Login:** Existing user can login
- [ ] **Investor Dashboard:** Loads correctly
- [ ] **Submit Offer:** New investor can submit offer (THIS WAS YOUR ORIGINAL ISSUE)
- [ ] **Advisor Dashboard:** Shows investor offers
- [ ] **Co-Investment:** Works correctly
- [ ] **Startup Dashboard:** Works correctly

### If All Tests Pass:
🎉 **SUCCESS! Migration complete!**

### If Any Test Fails:
- See troubleshooting section below

---

## 🚨 IF SOMETHING BREAKS - Rollback Options

### Option 1: Restore from Backup (Safest)
1. Go to Supabase Dashboard → Database → Backups
2. Find your backup file
3. Click "Restore"
4. Everything goes back to before migration

### Option 2: Run Rollback Script
1. Copy `ROLLBACK_MIGRATION_TO_USERS.sql`
2. Run in SQL Editor
3. This reverts foreign keys back to users table

---

## ⏱️ Total Time Needed

- Backup: 5 minutes
- Backfill: 2 minutes
- Migration: 5 minutes
- Functions: 3 minutes
- Verification: 2 minutes
- Testing: 10 minutes
- **Total: ~30 minutes**

---

## 📝 Current Status

- [ ] STEP 1: Backup completed
- [ ] STEP 2: Backfill completed
- [ ] STEP 3: Migration completed
- [ ] STEP 4: Functions updated
- [ ] STEP 5: Verified (check shows ✅)
- [ ] STEP 6: Tests passed

---

## Next Action

**Start with STEP 1 (Backup) right now!**

Let me know when you complete each step, or if you encounter any errors.

