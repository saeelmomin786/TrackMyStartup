# Due Diligence Flow Test Checklist

## Pre-Test Setup
1. ✅ Run SQL migrations:
   - `ADD_DILIGENCE_URLS_TO_OPPORTUNITY_APPLICATIONS.sql`
   - `CREATE_DILIGENCE_RPC_FUNCTIONS.sql`

2. ✅ Verify database setup:
```sql
-- Check if diligence_urls column exists
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'opportunity_applications' AND column_name = 'diligence_urls';

-- Check if RPC functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_name IN ('request_diligence', 'safe_update_diligence_status');
```

## Test Flow Step by Step

### Step 1: Facilitator Side - Request Due Diligence
**Action**: Go to Facilitator View → Intake Management
**Expected**:
- [ ] Find an application with status = 'pending'
- [ ] See "Request Diligence" button
- [ ] Click "Request Diligence" button
- [ ] See success message
- [ ] Button changes to "View Diligence Documents"

**Console Check**: Look for any errors in browser console

### Step 2: Startup Side - See Request
**Action**: Go to Startup Dashboard → Offers Received
**Expected**:
- [ ] See a "Due Diligence" row with status "pending"
- [ ] See "Upload Diligence Docs" button
- [ ] See "Open Compliance" button

**Console Check**: Look for these logs:
```
🔍 App X (id): diligence_status = "requested"
🔍 Diligence applications found: 1
🎯 Diligence offers: [array with items]
```

### Step 3: Startup Side - Upload Documents
**Action**: Click "Upload Diligence Docs" button
**Expected**:
- [ ] File picker opens (multiple files allowed)
- [ ] Select PDF/DOC files
- [ ] See "Diligence documents uploaded successfully" message
- [ ] Files are uploaded to Supabase Storage

**Console Check**: Look for upload success messages

### Step 4: Facilitator Side - View Documents
**Action**: Go back to Facilitator View → Intake Management
**Expected**:
- [ ] Click "View Diligence Documents" button
- [ ] Modal opens showing uploaded documents
- [ ] See "View" and "Download" buttons for each document
- [ ] See "Approve Diligence" and "Reject Diligence" buttons

### Step 5: Facilitator Side - Approve/Reject
**Action**: Click "Approve Diligence" or "Reject Diligence"
**Expected**:
- [ ] Success message appears
- [ ] Modal closes
- [ ] Application status updates in the table

## Database Verification
After each step, check the database:

```sql
-- Check application status
SELECT id, status, diligence_status, diligence_urls 
FROM opportunity_applications 
WHERE startup_id = YOUR_STARTUP_ID;
```

**Expected States**:
- After Step 1: `diligence_status = 'requested'`
- After Step 3: `diligence_urls = ['url1', 'url2', ...]`
- After Step 5: `diligence_status = 'approved'` or `'rejected'`

## Common Issues & Solutions

### Issue 1: "No due diligence requests showing"
**Check**: 
- Is `diligence_status` being set to 'requested'?
- Are you looking at the right startup dashboard?

### Issue 2: "Upload not working"
**Check**:
- Does `diligence_urls` column exist?
- Are there any console errors?

### Issue 3: "Facilitator can't see documents"
**Check**:
- Are documents being saved to `diligence_urls`?
- Is the query fetching `diligence_urls`?

### Issue 4: "RPC function not found"
**Check**:
- Did you run the SQL scripts?
- Are the functions created successfully?

## Test Results
- [ ] Step 1: Facilitator can request diligence
- [ ] Step 2: Startup sees the request
- [ ] Step 3: Startup can upload documents
- [ ] Step 4: Facilitator can view documents
- [ ] Step 5: Facilitator can approve/reject

## Next Steps
If any step fails, share:
1. Console error messages
2. Database query results
3. Which step failed
4. What you expected vs what happened
