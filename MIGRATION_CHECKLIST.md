# Migration Checklist - Complete Migration to user_profiles

Use this checklist to ensure you complete all steps safely:

## Pre-Migration Checklist

- [ ] **BACKUP DATABASE** (See BACKUP_AND_ROLLBACK_GUIDE.md)
  - [ ] Backup file downloaded: `backup_before_user_profiles_migration_YYYY-MM-DD.sql`
  - [ ] Backup file stored safely (cloud + local)
  - [ ] Backup file size > 0 bytes
  - [ ] Verified backup contains SQL statements

- [ ] **Review Migration Plan**
  - [ ] Read MIGRATION_SUMMARY_USER_PROFILES.md
  - [ ] Understand what will change
  - [ ] Understand rollback procedure

- [ ] **Notify Team** (if applicable)
  - [ ] Inform team about migration
  - [ ] Schedule maintenance window if needed
  - [ ] Set status page to "maintenance mode" if needed

## Migration Steps

### Step 1: Backfill user_profiles
- [ ] Run `BACKFILL_USER_PROFILES_BEFORE_MIGRATION.sql`
- [ ] Verify output: "All users have matching user_profiles rows"
- [ ] Check for warnings or errors

### Step 2: Run Safe Migration
- [ ] Run `SAFE_MIGRATION_TO_USER_PROFILES.sql`
- [ ] Review all warnings/notices in output
- [ ] Verify: "Migration Complete" message
- [ ] Check final verification query shows FKs pointing to user_profiles

### Step 3: Update SQL Functions
- [ ] Run `UPDATE_CREATE_INVESTMENT_OFFER_FUNCTION_FOR_CO_INVESTMENT.sql`
- [ ] Run `CREATE_CO_INVESTMENT_OFFERS_TABLE.sql` (function part)
- [ ] Run `UPDATE_LEAD_INVESTOR_TRIGGER_FOR_USER_PROFILES.sql`

### Step 4: Deploy Code Changes
- [ ] Code changes already in place (lib/database.ts, components)
- [ ] Deploy updated code to production
- [ ] Verify no TypeScript/compilation errors

## Post-Migration Testing

- [ ] **User Authentication**
  - [ ] Existing user can login
  - [ ] New user can register
  - [ ] Profile switching works (if applicable)

- [ ] **Investor Flows**
  - [ ] Investor can view dashboard
  - [ ] Investor can submit offer (new and old users)
  - [ ] Investor can view their offers
  - [ ] Co-investment flows work

- [ ] **Advisor Flows**
  - [ ] Advisor can login
  - [ ] Advisor dashboard shows investor offers
  - [ ] Advisor can approve/reject offers

- [ ] **Startup Flows**
  - [ ] Startup can login
  - [ ] Startup can view offers
  - [ ] Startup can accept/reject offers

- [ ] **Admin Flows**
  - [ ] Admin can view all users
  - [ ] Admin can manage users

## If Issues Occur

- [ ] Check error logs
- [ ] Review Supabase logs
- [ ] Check browser console for errors
- [ ] Verify all foreign keys exist
- [ ] Verify user_profiles has all users

### If Critical Issues:
- [ ] **STOP** and assess situation
- [ ] Run `ROLLBACK_MIGRATION_TO_USERS.sql` if needed
- [ ] OR restore from backup
- [ ] Document what went wrong
- [ ] Fix issues before retrying

## Success Criteria

- [ ] All tests pass
- [ ] No errors in logs
- [ ] All users can access their data
- [ ] New user registrations work
- [ ] Foreign keys point to user_profiles
- [ ] Performance is acceptable

## Post-Migration Cleanup

- [ ] Document any issues encountered
- [ ] Update team on migration status
- [ ] Update documentation if needed
- [ ] Mark migration as complete
- [ ] Keep backup file for at least 30 days

## Notes

Write any issues, observations, or notes here:

_____________________________________________________
_____________________________________________________
_____________________________________________________


