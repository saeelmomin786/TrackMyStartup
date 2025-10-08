# Error Resolution Guide

## Problem Summary
The application is experiencing a **400 error** when trying to submit opportunity applications due to database schema conflicts and missing columns.

## Root Cause Analysis

### 1. Schema Conflicts
- **CREATE_FACILITATOR_OPPORTUNITIES.sql**: Creates `opportunity_applications` with UUID primary key
- **COMPLETE_FIX_SCRIPT.sql**: Creates `opportunity_applications` with BIGSERIAL primary key
- **Missing columns**: `sector` column is referenced in frontend but doesn't exist in database

### 2. Authentication Issues
- User is authenticated (`isAuthenticated: true`) but on landing page (`currentPage: landing`)
- This suggests the authentication state is correct but routing logic may need adjustment

### 3. API Endpoint Issues
- Supabase API returning 400 status for `opportunity_applications` table operations
- Likely due to RLS (Row Level Security) policy conflicts or missing permissions

## Solution Steps

### Step 1: Apply Database Fix
Run the `FINAL_OPPORTUNITY_APPLICATIONS_FIX.sql` script in your Supabase SQL editor. This will:
- Drop and recreate the `opportunity_applications` table with correct schema
- Add missing `sector` column
- Set up proper RLS policies
- Create necessary indexes

### Step 2: Verify Authentication Flow
The authentication appears to be working correctly. The user is authenticated but on the landing page, which is expected behavior.

### Step 3: Test the Fix
After applying the database fix:
1. Try submitting an opportunity application
2. Check browser console for any remaining errors
3. Verify that applications are being saved to the database

## Expected Results After Fix

### Database Schema
```sql
opportunity_applications:
- id: UUID (primary key)
- startup_id: BIGINT (foreign key to startups)
- opportunity_id: UUID (foreign key to incubation_opportunities)
- status: TEXT (default: 'pending')
- pitch_deck_url: TEXT (nullable)
- pitch_video_url: TEXT (nullable)
- sector: TEXT (nullable) -- This was missing!
- agreement_url: TEXT (nullable)
- diligence_status: TEXT (nullable)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### RLS Policies
- Startups can insert/select their own applications
- Facilitators can select/update applications for their opportunities
- Proper authentication checks in place

## Troubleshooting

### If 400 Error Persists
1. Check Supabase logs for detailed error messages
2. Verify RLS policies are correctly applied
3. Ensure user has proper permissions
4. Check if `incubation_opportunities` table exists and has data

### If Authentication Issues Persist
1. Check browser console for authentication errors
2. Verify Supabase configuration
3. Check if user session is valid

## Files Modified
- `FINAL_OPPORTUNITY_APPLICATIONS_FIX.sql` - Database schema fix
- `ERROR_RESOLUTION_GUIDE.md` - This guide

## Next Steps
1. Apply the database fix
2. Test the application submission flow
3. Monitor for any remaining errors
4. Update documentation if needed









