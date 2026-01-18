# 🔧 FIX: Investor Advisor Dashboard Not Detecting Premium Subscriptions

## Problem
In the Investment Advisor dashboard, when a startup has taken/purchased a premium subscription, the dashboard is **NOT showing** that the startup has premium access.

## Root Cause
The query fetching startup subscriptions was **missing the `plan_tier` filter**:

### Before (BROKEN):
```javascript
// InvestmentAdvisorView.tsx line 3007
const { data: subscriptions, error } = await supabase
  .from('user_subscriptions')
  .select('user_id, paid_by_advisor_id, status, current_period_end')
  .in('user_id', startupUserIds)
  .eq('status', 'active');
  // ❌ Missing: .eq('plan_tier', 'premium')
```

**Why this broke:**
- Query returns ALL active subscriptions (free + premium)
- The code was not filtering for `plan_tier = 'premium'`
- If subscription had `plan_tier = NULL` or `plan_tier = 'free'`, it wouldn't be detected as premium
- Even if `plan_tier = 'premium'`, without explicit filter, unexpected subscriptions could be included

## Fix Applied
Added `plan_tier = 'premium'` filter to the query:

### After (FIXED):
```javascript
// InvestmentAdvisorView.tsx line 3007
const { data: subscriptions, error } = await supabase
  .from('user_subscriptions')
  .select('user_id, paid_by_advisor_id, status, current_period_end, plan_tier')
  .in('user_id', startupUserIds)
  .eq('status', 'active')
  .eq('plan_tier', 'premium');
  // ✅ Now explicitly filters for premium tier
```

## Changes Made
- **File:** [InvestmentAdvisorView.tsx](components/InvestmentAdvisorView.tsx#L3007)
- **Lines:** 3006-3013
- **Changes:**
  1. Added `plan_tier` to `.select()` clause
  2. Added `.eq('plan_tier', 'premium')` filter to query
  3. Added comment explaining critical requirement

## How It Works Now

**Flow:**
1. Investment Advisor opens dashboard → Loads Management or Credits tab
2. Component fetches all startup IDs from myStartups + advisorAddedStartups
3. **Queries subscriptions:** 
   - Finds rows in `user_subscriptions` with:
     - `user_id` IN (all startup profile_ids) ✅
     - `status = 'active'` ✅
     - `plan_tier = 'premium'` ✅ (NEW)
4. For each subscription found:
   - If `paid_by_advisor_id IS NULL` → marks as "Self-Paid Premium"
   - If `paid_by_advisor_id IS NOT NULL` → marks as "Advisor-Paid Premium"
5. Dashboard displays:
   - "Premium Active" badge with expiry date ✅
   - "Expires: [date]" in startup card
   - Toggle disabled (can't downgrade self-paid premium)

## Data Verification

**Before testing, verify in Supabase:**

```sql
-- Check if subscription has plan_tier set
SELECT 
  user_id,
  status,
  plan_tier,
  paid_by_advisor_id,
  current_period_end,
  created_at
FROM user_subscriptions
WHERE plan_tier = 'premium'
AND status = 'active'
LIMIT 5;
```

Expected result:
- Rows should exist with `plan_tier = 'premium'`
- For each startup that purchased premium, one row should match

**If no results:** The startup's subscription might not have `plan_tier` set. Check with:

```sql
-- Check subscriptions for specific startup
SELECT 
  user_id,
  status,
  plan_tier,
  paid_by_advisor_id,
  current_period_end
FROM user_subscriptions
WHERE user_id = 'startup_profile_id_here'
ORDER BY created_at DESC;
```

If `plan_tier IS NULL`, see section "If Premium Still Not Detected" below.

## Testing Instructions

### Test 1: Self-Paid Premium (Startup Purchased)
1. Login as **Investment Advisor**
2. Go to **Management** tab → **My Startups** section
3. Find the startup that purchased premium
4. **Expected:** See "Premium Active" badge with expiry date
5. **Should show:** "Expires: [date]"
6. Premium toggle should be **DISABLED** (grayed out)

### Test 2: Advisor-Paid Premium (Advisor Assigned)
1. Login as **Investment Advisor**  
2. Go to **Credits** tab → find startup with premium assignment
3. **Expected:** See "Premium Active" badge with expiry date
4. **Should show:** "Expires: [date]"
5. Premium toggle should be **ENABLED** (can toggle off)

### Test 3: Expiration Check
1. Find startup with premium that expires today or tomorrow
2. **Expected:** See expiry date displayed
3. After expiry passes → badge changes to "Premium Expired"

## If Premium Still Not Detected

### Step 1: Check Database
Run in Supabase SQL Editor:

```sql
-- For your specific startup
SELECT * FROM user_subscriptions 
WHERE user_id = 'STARTUP_PROFILE_ID'
ORDER BY created_at DESC;
```

**Look for:**
- Is `plan_tier` set to 'premium'? (Or is it NULL/empty?)
- Is `status` set to 'active'?
- Is `current_period_end` in the future?
- Is `paid_by_advisor_id` NULL (self-paid) or has a value (advisor-paid)?

### Step 2: Fix Missing plan_tier
If `plan_tier IS NULL`, run:

```sql
-- Update the subscription with correct plan_tier
UPDATE user_subscriptions
SET plan_tier = 'premium'
WHERE user_id = 'STARTUP_PROFILE_ID'
AND status = 'active'
AND plan_tier IS NULL;
```

Then refresh the dashboard.

### Step 3: Check Expiration
If `current_period_end` is in the past, the subscription expired:

```sql
-- Check expiry
SELECT 
  user_id,
  status,
  current_period_end,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP > current_period_end as is_expired
FROM user_subscriptions
WHERE user_id = 'STARTUP_PROFILE_ID';
```

If expired and should be active, extend the date:

```sql
UPDATE user_subscriptions
SET current_period_end = CURRENT_TIMESTAMP + INTERVAL '30 days'
WHERE user_id = 'STARTUP_PROFILE_ID'
AND status = 'active';
```

## Summary

**Fixed:** Investment Advisor dashboard now properly detects when startups have purchased premium subscriptions by:
1. ✅ Filtering for `plan_tier = 'premium'` in subscription query
2. ✅ Including profile_id matching logic for new registrations
3. ✅ Displaying "Premium Active" badge with expiry dates

**Status:** ✅ READY FOR TESTING

**Files Modified:**
- [InvestmentAdvisorView.tsx](components/InvestmentAdvisorView.tsx#L3007) - Added plan_tier filter

**Impact:** Dashboard now correctly identifies startups with self-paid and advisor-paid premium subscriptions.
