# File Upload Issue Fix - Pitch Deck, One-Pager, Business Plan

## Problem Description

Users with **new registrations** are unable to upload:
- Pitch Deck files
- One-Pager PDF files
- Business Plan files

The uploads fail with permission errors or silently fail.

## Root Cause

The issue is caused by **Storage Bucket RLS policies** that are using old authentication methods that don't work for new registrations. The policies may be:
1. Using helper functions like `is_startup()` that check the old `users` table
2. Not properly checking `startups.user_id = auth.uid()` based on the folder path
3. Missing or incorrect policies for the storage buckets

## Solution

A SQL fix script has been created: `FIX_STORAGE_POLICIES_NEW_REGISTRATION.sql`

This script:
1. Drops old storage policies that use the old authentication method
2. Creates new storage policies that check `startups.user_id = auth.uid()` based on folder path
3. Ensures buckets exist (`pitch-decks` and `business-plans`)
4. Includes proper policies for INSERT, SELECT, UPDATE, and DELETE operations
5. Includes Admin access for management
6. Allows public read access for business plans (for investors)

## File Storage Structure

Files are stored with the following structure:
- **Pitch Deck**: `{startupId}/pitch-decks/{timestamp}_{filename}`
- **One-Pager**: `{startupId}/one-pagers/one-pager.pdf`
- **Business Plan**: `{startupId}/business-plan.{ext}`

The policies check the first folder in the path (`{startupId}`) to verify ownership.

## Implementation Steps

### Step 1: Run the SQL Fix Script

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Run the script: `FIX_STORAGE_POLICIES_NEW_REGISTRATION.sql`
4. Verify the policies were created correctly

### Step 2: Verify Buckets Exist

1. Go to Storage in Supabase Dashboard
2. Verify these buckets exist:
   - `pitch-decks` (public, 50MB limit, PDF only)
   - `business-plans` (public, 10MB limit, PDF, DOC, DOCX)

If they don't exist, the script will create them automatically.

### Step 3: Test the Fix

1. Log in as a user with a new registration
2. Navigate to Startup Dashboard → Fundraising → Portfolio
3. Try uploading:
   - Pitch Deck (PDF file)
   - Business Plan (PDF, DOC, or DOCX file)
   - One-Pager (via "Save Fundraising & One‑Pager" button)
4. Verify the files upload successfully and URLs are saved

## Code Changes Made

### 1. Error Handling Improvements

**File:** `lib/capTableService.ts`
- Added detailed error logging for all upload functions
- Added specific error messages for permission/storage policy errors
- Added helpful hints for debugging
- Added console logging for upload progress

**Functions Updated:**
- `uploadPitchDeck()` - Added error logging and better error messages
- `uploadBusinessPlan()` - Added error logging and better error messages
- `uploadOnePagerPDF()` - Added error logging and better error messages

## Storage Policies Created

### Pitch Decks Bucket (`pitch-decks`)
- `pitch-decks-upload-own` - INSERT policy (users can upload to their startup's folder)
- `pitch-decks-read-own` - SELECT policy (users can read their startup's files)
- `pitch-decks-update-own` - UPDATE policy (users can update their startup's files)
- `pitch-decks-delete-own` - DELETE policy (users can delete their startup's files)

### Business Plans Bucket (`business-plans`)
- `business-plans-upload-own` - INSERT policy (users can upload to their startup's folder)
- `business-plans-read-own` - SELECT policy (authenticated users can read)
- `business-plans-read-public` - SELECT policy (public read for investors)
- `business-plans-update-own` - UPDATE policy (users can update their startup's files)
- `business-plans-delete-own` - DELETE policy (users can delete their startup's files)

## Verification

After running the SQL fix, verify:

1. **Storage Policies Created:**
   ```sql
   SELECT policyname, cmd, qual, with_check
   FROM pg_policies 
   WHERE tablename = 'objects' 
   AND schemaname = 'storage'
   AND (policyname LIKE '%pitch-deck%' OR policyname LIKE '%business-plan%')
   ORDER BY policyname, cmd;
   ```

2. **Buckets Exist:**
   ```sql
   SELECT id, name, public, file_size_limit, allowed_mime_types
   FROM storage.buckets
   WHERE id IN ('pitch-decks', 'business-plans');
   ```

3. **User Can See Their Startup:**
   ```sql
   SELECT 
       auth.uid() as current_auth_user_id,
       s.id as startup_id,
       s.name as startup_name,
       s.user_id as startup_user_id,
       CASE 
           WHEN s.id IS NOT NULL AND s.user_id = auth.uid() THEN '✅ Startup match found'
           WHEN s.id IS NOT NULL THEN '⚠️ Startup exists but user_id mismatch'
           ELSE '⚠️ No startup found for this user'
       END as status
   FROM startups s
   WHERE s.user_id = auth.uid()
   LIMIT 1;
   ```

## Troubleshooting

If uploads still fail after running the fix:

1. **Check Browser Console:**
   - Look for detailed error messages
   - Check for permission denied errors (403)
   - Verify the startup ID is correct

2. **Check Storage Policies:**
   - Verify the new policies were created
   - Check that no conflicting policies exist
   - Verify the policies are enabled

3. **Check File Size:**
   - Pitch Deck: Max 50MB
   - Business Plan: Max 10MB
   - One-Pager: Max 50MB (uses pitch-decks bucket)

4. **Check File Type:**
   - Pitch Deck: PDF only
   - Business Plan: PDF, DOC, DOCX
   - One-Pager: PDF only

5. **Check Authentication:**
   - Verify the user is properly authenticated
   - Check that `auth.uid()` returns the correct user ID
   - Verify the startup's `user_id` matches `auth.uid()`

6. **Check Folder Path:**
   - Verify the file path starts with `{startupId}/`
   - Check that the startup ID in the path matches the authenticated user's startup

## Related Files

- `FIX_STORAGE_POLICIES_NEW_REGISTRATION.sql` - SQL fix script
- `lib/capTableService.ts` - Service layer for file uploads
- `components/startup-health/FundraisingTab.tsx` - Frontend component that uses uploads


