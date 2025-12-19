# Backup and Rollback Guide for Migration

## ⚠️ CRITICAL: Always Backup Before Migration!

### Why Backup is Essential:
1. **Data Safety:** If something goes wrong, you can restore your database
2. **Quick Recovery:** Restore backup instead of manually fixing data
3. **Peace of Mind:** Test migration safely knowing you can rollback

---

## Step 1: Create Database Backup

### Option A: Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard:**
   - Navigate to your project
   - Click on **Database** in the left sidebar

2. **Create Backup:**
   - Click **Backups** tab
   - Click **Create Backup** or **Download Backup**
   - Choose **Full Database Backup**
   - Wait for backup to complete
   - Download the backup file to your computer

3. **Backup File:**
   - Save with name: `backup_before_user_profiles_migration_YYYY-MM-DD.sql`
   - Keep it safe! You'll need it if rollback is needed

### Option B: pg_dump (Command Line)

If you have direct database access:

```bash
# Replace with your connection string
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  --schema=public \
  --schema=auth \
  --file=backup_before_user_profiles_migration_$(date +%Y%m%d).sql
```

### Option C: Supabase CLI

```bash
supabase db dump -f backup_before_migration.sql
```

---

## Step 2: Verify Backup

Before proceeding, verify your backup:

1. **Check file size:** Should be > 0 bytes
2. **Check file contents:** Open and verify it contains SQL statements
3. **Store safely:** Keep in multiple places (cloud + local)

---

## Step 3: Run Migration

Now you can safely run:
1. `BACKFILL_USER_PROFILES_BEFORE_MIGRATION.sql`
2. `SAFE_MIGRATION_TO_USER_PROFILES.sql`

---

## Step 4: If You Need to Rollback

### Quick Rollback Option 1: Restore from Backup

1. **In Supabase Dashboard:**
   - Go to **Database** → **Backups**
   - Find your backup
   - Click **Restore** or download and restore manually

2. **Manual Restore:**
   ```sql
   -- Connect to your database
   -- Run the backup SQL file
   psql -f backup_before_user_profiles_migration_YYYY-MM-DD.sql
   ```

### Quick Rollback Option 2: Use Rollback Script

Run `ROLLBACK_MIGRATION_TO_USERS.sql` (see below)

---

## What Gets Backed Up?

- ✅ All table data (users, user_profiles, investment_offers, etc.)
- ✅ Table structures (schemas)
- ✅ Foreign key constraints
- ✅ Indexes
- ✅ Functions and triggers
- ✅ RLS policies

---

## Testing After Migration

After migration, test these critical flows:

1. ✅ User login (existing users)
2. ✅ Investor offer submission
3. ✅ Advisor dashboard
4. ✅ Co-investment flows
5. ✅ New user registration

If anything breaks, use rollback immediately!


