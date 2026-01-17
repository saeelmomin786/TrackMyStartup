# 🔧 FIX: Add plan_tier to createUserSubscription()

## 📍 Root Cause

**File:** `lib/paymentService.ts`
**Function:** `createUserSubscription()` (Line ~1273)
**Issue:** When creating subscriptions for FREE/zero-price payments, `plan_tier` is NOT being set

**Impact:**
- Subscription created with `plan_tier = NULL`
- Dashboard shows wrong plan
- Feature access checks fail
- Billing management breaks

---

## ✅ The Fix

### Step 1: Find the Function

Open `lib/paymentService.ts` and go to line **~1354**

Look for:
```typescript
const subscriptionData: any = {
  user_id: profileId,
  plan_id: plan.id,
  status: 'active',
  current_period_start: now.toISOString(),
  current_period_end: periodEnd.toISOString(),
  amount: plan.price,
  interval: plan.interval,
  is_in_trial: false,
  updated_at: now.toISOString(),
};
```

### Step 2: Add plan_tier

**Change to:**
```typescript
const subscriptionData: any = {
  user_id: profileId,
  plan_id: plan.id,
  plan_tier: plan.plan_tier, // ← ADD THIS LINE!
  status: 'active',
  current_period_start: now.toISOString(),
  current_period_end: periodEnd.toISOString(),
  amount: plan.price,
  interval: plan.interval,
  is_in_trial: false,
  updated_at: now.toISOString(),
};
```

**That's it!** Just ONE line added. 🎯

---

## 🧪 Test the Fix

### Before Fix:
```javascript
console.log(subscriptionData);
// Output:
{
  user_id: "uuid...",
  plan_id: "uuid...",
  plan_tier: undefined, // ❌ Missing!
  status: "active"
}
```

### After Fix:
```javascript
console.log(subscriptionData);
// Output:
{
  user_id: "uuid...",
  plan_id: "uuid...",
  plan_tier: "premium", // ✅ Present!
  status: "active"
}
```

---

## 🗄️ Fix Existing Broken Subscriptions

After deploying the code fix, update existing subscriptions:

```sql
-- Fix subscription that user just created
UPDATE user_subscriptions
SET plan_tier = 'premium'
WHERE id = 'e9fb91ae-5e61-4ffd-ab9c-f696be78e6d9';

-- Fix ALL subscriptions with NULL plan_tier
UPDATE user_subscriptions us
SET plan_tier = sp.plan_tier
FROM subscription_plans sp
WHERE us.plan_id = sp.id
  AND us.plan_tier IS NULL
  AND sp.plan_tier IS NOT NULL;

-- Verify fix
SELECT 
  us.id,
  us.plan_tier,
  sp.plan_tier as correct_plan_tier,
  CASE 
    WHEN us.plan_tier = sp.plan_tier THEN '✅ FIXED'
    ELSE '❌ STILL WRONG'
  END as status
FROM user_subscriptions us
JOIN subscription_plans sp ON us.plan_id = sp.id
WHERE us.created_at >= '2026-01-17'
ORDER BY us.created_at DESC;
```

---

## 📋 Verification Checklist

After applying the fix:

### Code Level:
- [ ] `plan_tier` added to `subscriptionData` object
- [ ] File saved
- [ ] Servers restarted
- [ ] No TypeScript/build errors

### Testing:
- [ ] Create new free subscription
- [ ] Check browser console - `plan_tier: 'premium'` ✅
- [ ] Check Supabase - `plan_tier` column has value ✅
- [ ] Dashboard shows correct plan ✅

### Database:
- [ ] Existing broken subscriptions updated
- [ ] Verification query shows all fixed
- [ ] User can see correct plan in dashboard

---

## 🎯 Why This Works

**Before Fix:**
```typescript
// createUserSubscription() was called for free subscriptions
// It created subscription BUT didn't copy plan_tier from plan object
subscriptionData = {
  plan_id: plan.id, // ← References plan
  // ❌ No plan_tier field!
}
```

**After Fix:**
```typescript
// Now it explicitly sets plan_tier from the plan object
subscriptionData = {
  plan_id: plan.id,
  plan_tier: plan.plan_tier, // ← ✅ Copied from plan!
}
```

**Why plan_tier exists in the plan object:**
- You already fixed `subscription_plans` table
- All plans now have `plan_tier = 'premium'`
- The plan object passed to this function has it
- We just needed to COPY it to the subscription data!

---

## 🚀 Deployment Steps

1. **Apply fix locally** (add the one line)
2. **Test locally** (create subscription, verify plan_tier is set)
3. **Commit changes:**
   ```powershell
   git add lib/paymentService.ts
   git commit -m "fix: add plan_tier to createUserSubscription()"
   git push
   ```
4. **Deploy to Vercel** (auto-deploys on push)
5. **Run SQL fix** in production Supabase
6. **Verify user's subscription** now shows correct plan

---

## 💡 Related Issues This Fixes

1. ✅ Advisor-paid subscriptions now work (plan_tier was already fixed in subscription_plans)
2. ✅ Free/coupon subscriptions now have plan_tier
3. ✅ Dashboard shows correct plan
4. ✅ Feature access checks work correctly
5. ✅ No more "Free Plan" showing for premium users

---

## 🐛 What About Payment Metadata?

**Note:** This fix does NOT add payment metadata (razorpay_subscription_id, payment_gateway, etc.)

**Why?**
- For FREE subscriptions, those fields SHOULD be NULL (no payment occurred)
- For PAID subscriptions, those are set by `/api/payment/verify` endpoint
- This is correct behavior!

**The real issue:**
- User's subscription was created as FREE (price = 0)
- But it SHOULD have been PAID
- Need to check why payment wasn't processed
- Separate issue from plan_tier bug

---

## ✅ Success Criteria

**Fix is successful when:**
- New subscriptions have `plan_tier` set ✅
- Dashboard displays correct plan ✅
- Feature access works correctly ✅
- No console errors ✅
- Existing subscriptions updated ✅

**Ready to apply the fix? Let's do it!** 🎯
