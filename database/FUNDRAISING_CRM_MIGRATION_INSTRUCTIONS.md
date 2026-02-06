# Fundraising CRM Backend Migration

## ⚠️ IMPORTANT - RUN THIS FIRST!

Before the CRM feature will work properly, you MUST run the SQL migration to create the database tables.

## Steps to Apply the Migration

### 1. Open Supabase Dashboard
1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar

### 2. Run the Migration SQL
1. Open the file: `database/CREATE_FUNDRAISING_CRM_TABLES.sql`
2. Copy ALL the contents of this file
3. Paste it into the Supabase SQL Editor
4. Click **RUN** or press `Ctrl+Enter`

### 3. Verify Success
You should see success messages like:
```
✅ Fundraising CRM tables created successfully!
✅ RLS policies applied
✅ Default columns added for all startups
```

### 4. Check Tables Were Created
In Supabase, go to **Table Editor** and verify these tables exist:
- `fundraising_crm_columns`
- `fundraising_crm_investors`
- `fundraising_crm_metadata`
- `fundraising_crm_attachments`

## What This Migration Does

### Tables Created:
1. **fundraising_crm_columns** - Stores custom board column configurations
2. **fundraising_crm_investors** - Stores investor data (name, email, amount, pitch deck URL)
3. **fundraising_crm_metadata** - Stores CRM tracking data (status, priority, tags, notes, approach)
4. **fundraising_crm_attachments** - Stores document attachments for investors and programs

### Features Enabled:
- ✅ **Customize Columns** - Now saved to database instead of localStorage
- ✅ **Investor CRM** - All investor data persisted to database
- ✅ **Program Tracking** - CRM metadata for programs saved to database
- ✅ **Cross-Device Sync** - Data accessible from any browser/device
- ✅ **Data Backup** - No more data loss from browser cache clears

## Automatic Data Migration

The app will automatically migrate existing data from localStorage to the database:
- Existing custom columns will be migrated
- Existing investors will be migrated
- Existing program metadata will be migrated

This migration runs once per startup automatically.

## Troubleshooting

### If migration fails:
1. Check the browser console for error messages
2. Verify you have proper RLS policies set up
3. Ensure your user has access to the startup
4. Try running the SQL migration again

### If you see "relation does not exist" errors:
- The SQL migration hasn't been run yet
- Run the `CREATE_FUNDRAISING_CRM_TABLES.sql` file in Supabase

### If columns don't save:
- Check browser console for errors
- Verify RLS policies are in place
- Make sure user is authenticated

## Support

If you continue to have issues:
1. Check the browser developer console (F12) for errors
2. Check the Supabase logs for database errors
3. Verify all tables were created successfully
