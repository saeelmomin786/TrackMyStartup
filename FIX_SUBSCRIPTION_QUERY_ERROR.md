# Fix Subscription Query 406 Error

## Problem
The subscription query was failing with a 406 error because it was trying to use a nested foreign key join that PostgREST doesn't support in that format.

## Solution
Changed the query to:
1. Fetch subscription data first without join
2. If `plan_tier` is missing, fetch plan details separately
3. This avoids the 406 error and is more reliable

## Changes Made
- Updated `lib/subscriptionService.ts` → `getUserSubscription()` method
- Removed nested select with foreign key join
- Added fallback to fetch plan separately if needed

## Status
✅ Fixed - The query should now work without 406 errors.

---

## Also Needed: Run Compliance Migration

You also need to run the migration for "Submitted" status:

**File:** `ADD_SUBMITTED_STATUS_TO_COMPLIANCE_CHECKS.sql`

**Run this in Supabase SQL Editor** to add "Submitted" as a valid status for compliance checks.
