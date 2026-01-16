# Razorpay Plan Cache Fix

## Problem
Every payment was creating a new Razorpay plan, even when the same plan (same amount, currency, period) already existed. This caused:
- Duplicate plans in Razorpay dashboard
- Inefficient plan management
- Potential issues with plan tracking

## Solution
Implemented plan caching with unique constraint to ensure:
- **Same amount + currency + period + interval_count = Same plan_id** (shared across all users)
- Plans are reused when they already exist
- New plans are only created when admin updates prices

## Changes Made

### 1. Database Migration (`database/fix_razorpay_plan_cache.sql`)
- Created/updated `razorpay_plans_cache` table with unique constraint on `(amount_paise, currency, period, interval_count)`
- Added indexes for faster lookups
- Migrated existing data: `'month'` → `'monthly'`, `'year'` → `'yearly'`
- Added proper permissions

### 2. Fixed `getOrCreateRazorpayPlan` Function
**Files updated:**
- `api/razorpay/create-subscription.ts`
- `server.js`

**Key fixes:**
- Changed default period from `'month'` to `'monthly'` (Razorpay expects `'monthly'`)
- Added period normalization (`'month'` → `'monthly'`, `'year'` → `'yearly'`)
- Improved cache lookup with better error handling
- Added duplicate detection (unique constraint violation handling)
- Added logging for debugging

## How It Works

1. **Cache Lookup First**: Before creating a plan, check if one exists with same `(amount_paise, currency, period, interval_count)`
2. **Reuse Existing Plan**: If found, return cached `plan_id` (all users share it)
3. **Create New Plan**: Only if not found in cache
4. **Cache New Plan**: Insert into cache with unique constraint (prevents duplicates)
5. **Handle Conflicts**: If duplicate detected, fetch and return existing plan

## Impact

### ✅ Startup Subscriptions (Basic/Premium)
- All users paying ₹500/month for Basic → **1 plan** (shared)
- All users paying ₹2000/month for Premium → **1 plan** (shared)
- When admin updates price → **New plan created** (correct behavior)

### ✅ Investor Advisor Subscriptions (5, 10, 15, 20 credits)
- All advisors buying "10 credits at ₹500/month" → **1 plan** (shared)
- Different credit amounts → **Different plans** (correct - different prices)
- When admin updates price → **New plan created** (correct behavior)

### ✅ Mentor Payments
- Not affected (one-time payments, no plans needed)

## Testing

1. **Run SQL migration**:
   ```sql
   -- Run in Supabase SQL editor
   \i database/fix_razorpay_plan_cache.sql
   ```

2. **Test plan reuse**:
   - User 1 subscribes to Basic plan (₹500/month)
   - User 2 subscribes to Basic plan (₹500/month)
   - Check Razorpay dashboard → Should see **1 plan** (not 2)
   - Check `razorpay_plans_cache` table → Should see **1 entry**

3. **Test price update**:
   - Admin updates Basic plan price to ₹600/month
   - New user subscribes → **New plan created** (correct - price changed)

## Files Changed

1. `database/fix_razorpay_plan_cache.sql` - Database migration
2. `api/razorpay/create-subscription.ts` - Fixed plan creation logic
3. `server.js` - Fixed plan creation logic

## Next Steps

1. Run the SQL migration in Supabase
2. Test with a few subscription payments
3. Monitor Razorpay dashboard to confirm no duplicate plans
4. Verify cache table is working correctly
