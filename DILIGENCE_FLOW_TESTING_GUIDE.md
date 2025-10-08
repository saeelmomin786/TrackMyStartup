# Due Diligence Flow Testing Guide

## Step 1: Run SQL Migrations

Run these SQL scripts in your Supabase SQL editor in this order:

1. **First**: `ADD_DILIGENCE_URLS_TO_OPPORTUNITY_APPLICATIONS.sql`
2. **Second**: `CREATE_DILIGENCE_RPC_FUNCTIONS.sql`

## Step 2: Test the Complete Flow

### A. Facilitator Side (Request Due Diligence)
1. Go to Facilitator View → Intake Management
2. Find an application with status = 'accepted'
3. Click "Request Diligence" button
4. **Expected**: Application should show "View Diligence Documents" button

### B. Startup Side (See Request & Upload Documents)
1. Go to Startup Dashboard → Offers Received
2. **Expected**: Should see a "Due Diligence" row with status "pending"
3. Click "Upload Diligence Docs" button
4. Select multiple files (PDF, DOC, etc.)
5. **Expected**: Files should upload and show success message

### C. Facilitator Side (View Documents & Approve/Reject)
1. Go back to Facilitator View → Intake Management
2. Click "View Diligence Documents" button
3. **Expected**: Should see all uploaded documents with View/Download options
4. Add approve/reject buttons in the modal

## Step 3: Debug Console Logs

Check browser console for these logs:

### Startup Dashboard:
- `🔍 App X (id): diligence_status = "requested"`
- `🔍 Diligence applications found: X`
- `🎯 Diligence offers: [array with items]`

### Facilitator View:
- Check if `diligence_urls` is being fetched in the query
- Check if documents show in the modal

## Step 4: Common Issues & Fixes

### Issue 1: "No due diligence requests showing"
**Fix**: Check if `diligence_status` is being set to 'requested' in database
**SQL Check**: 
```sql
SELECT id, status, diligence_status FROM opportunity_applications WHERE startup_id = YOUR_STARTUP_ID;
```

### Issue 2: "Upload not working"
**Fix**: Check if `diligence_urls` column exists
**SQL Check**:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'opportunity_applications' AND column_name = 'diligence_urls';
```

### Issue 3: "RPC function not found"
**Fix**: Run `CREATE_DILIGENCE_RPC_FUNCTIONS.sql` again

## Step 5: Manual Database Checks

```sql
-- Check if diligence_urls column exists
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'opportunity_applications' AND column_name = 'diligence_urls';

-- Check if RPC functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('request_diligence', 'safe_update_diligence_status');

-- Check current application status
SELECT id, status, diligence_status, diligence_urls 
FROM opportunity_applications 
WHERE startup_id = YOUR_STARTUP_ID;
```

## Step 6: Expected Database State

After successful flow:
- `diligence_status` should be 'requested' (after facilitator request)
- `diligence_urls` should be a JSON array with file URLs (after startup upload)
- `diligence_status` should be 'approved' (after facilitator approval)
