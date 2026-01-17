# Local Testing Setup for Subscription & Payment Flow

## 🎯 Goal
Test the subscription creation flow locally to understand:
1. Why `plan_tier` is not being set
2. Why payment metadata (razorpay_subscription_id, payment_gateway, etc.) is missing
3. Which code path creates incomplete subscriptions

---

## ✅ Step 1: Check Your Environment Variables

Open your `.env` file and ensure you have:

```env
# Razorpay Test Keys (from Razorpay Dashboard → Settings → API Keys → Test Mode)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

**Important:** Use **Razorpay TEST mode** keys, not live keys!

---

## ✅ Step 2: Install Dependencies (if needed)

```powershell
npm install
```

---

## ✅ Step 3: Start Local Servers

Open **TWO** terminal windows:

### Terminal 1: Start Backend Server (Port 3001)
```powershell
npm run server
```

You should see:
```
🚀 Server started on port 3001
✅ Supabase connected
```

### Terminal 2: Start Frontend Dev Server (Port 5173)
```powershell
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:5173/
```

---

## ✅ Step 4: Enable Console Logging

We need to see EXACTLY what's happening during subscription creation.

### Add Logging to paymentService.ts

Open `lib/paymentService.ts` and find the `createUserSubscription()` function (around line 1273).

**Add this RIGHT BEFORE the INSERT/UPDATE:**

```typescript
console.log('🔍 [DEBUG] About to create subscription with data:', {
  user_id: subscriptionData.user_id,
  plan_id: subscriptionData.plan_id,
  plan_tier: subscriptionData.plan_tier, // ← THIS WILL SHOW undefined!
  status: subscriptionData.status,
  amount: subscriptionData.amount,
  interval: subscriptionData.interval
});

console.log('🔍 [DEBUG] Original plan object:', {
  id: plan.id,
  name: plan.name,
  plan_tier: plan.plan_tier, // ← Should be 'premium'
  user_type: plan.user_type
});
```

---

## ✅ Step 5: Test Subscription Creation Flow

### Option A: Test Free/Coupon Subscription (Triggers the Bug)

1. Open browser: http://localhost:5173
2. Login as a startup user
3. Go to Subscription/Pricing page
4. Apply a 100% discount coupon (if you have one)
5. Click "Pay Now" or "Activate Free Subscription"

**Watch the browser console** - you'll see:
```
🔍 [DEBUG] About to create subscription with data: {
  plan_tier: undefined ← ❌ BUG!
}

🔍 [DEBUG] Original plan object: {
  plan_tier: 'premium' ← ✅ Plan HAS tier!
}
```

### Option B: Test Regular Payment Flow

1. Go to subscription page
2. Select a plan
3. Click "Pay Now"
4. In Razorpay checkout:
   - Use test card: `4111 1111 1111 1111`
   - CVV: `123`
   - Expiry: Any future date
   - OTP: `123456`
5. Complete payment

**Watch console** to see if payment verification flow runs.

---

## ✅ Step 6: Check Network Tab

Open **Chrome DevTools → Network tab**

**Look for these requests:**

1. **POST /api/razorpay/create-subscription**
   - Should create Razorpay subscription
   - Response should have `id` field

2. **POST /api/payment/verify**
   - Should be called AFTER payment success
   - Creates subscription with ALL metadata
   - If this is NOT called → That's the bug!

3. **Check Supabase requests:**
   - Look for `POST .../rest/v1/user_subscriptions`
   - Check the request payload - does it have `plan_tier`?

---

## ✅ Step 7: Verify in Supabase

Open Supabase Dashboard → Table Editor → `user_subscriptions`

**Check the latest subscription row:**

```sql
SELECT 
  id,
  plan_tier,
  razorpay_subscription_id,
  payment_gateway,
  autopay_enabled,
  created_at
FROM user_subscriptions
ORDER BY created_at DESC
LIMIT 1;
```

**If you see:**
- `plan_tier = NULL` ← createUserSubscription() was used
- `razorpay_subscription_id = NULL` ← Payment verify NOT called
- Both NULL → Free subscription created WITHOUT plan_tier

---

## 🐛 Expected Bug Behavior

When you test locally, you'll see:

### Scenario 1: Free Subscription (Price = 0)
```
Code Path: processPayment() → createUserSubscription()
Result:
  ✅ Subscription created
  ❌ plan_tier = NULL (not set!)
  ❌ No razorpay_subscription_id (correct - it's free)
  ❌ No payment_gateway (correct - it's free)
```

### Scenario 2: Paid Subscription (Payment Completed)
```
Code Path: processPayment() → Razorpay → verify endpoint
Result:
  ✅ Subscription created
  ✅ plan_tier = 'premium' (set in verify endpoint)
  ✅ razorpay_subscription_id present
  ✅ payment_gateway = 'razorpay'
```

---

## 🔧 The Fix We Need to Apply

After confirming the bug locally, we need to fix `createUserSubscription()`:

**File:** `lib/paymentService.ts`
**Line:** ~1354

**Add this line:**

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

---

## 📊 Testing Checklist

- [ ] Backend server running on port 3001
- [ ] Frontend dev server running on port 5173
- [ ] Razorpay test keys configured in .env
- [ ] Console logs added to paymentService.ts
- [ ] Browser DevTools open (Console + Network tabs)
- [ ] Test free subscription flow
- [ ] Verify plan_tier is undefined in console
- [ ] Check Supabase - confirm plan_tier = NULL
- [ ] Test paid subscription flow (optional)
- [ ] Verify /api/payment/verify is called
- [ ] Ready to apply fix!

---

## 🚀 Next Steps After Testing

Once you confirm the bug locally:

1. **Apply the fix** (add `plan_tier` to subscriptionData)
2. **Test again** - verify plan_tier is now set
3. **Fix existing broken subscriptions** with UPDATE query
4. **Deploy to production**

---

## 💡 Debugging Tips

### If Backend Won't Start:
```powershell
# Check if port 3001 is already in use
netstat -ano | findstr :3001

# Kill the process if needed
taskkill /PID <process_id> /F
```

### If Frontend Shows Errors:
```powershell
# Clear node_modules and reinstall
rm -r node_modules
rm package-lock.json
npm install
```

### If Razorpay Not Loading:
- Check browser console for CORS errors
- Verify RAZORPAY_KEY_ID starts with `rzp_test_`
- Check Network tab for failed API calls

---

## 📝 What to Share After Testing

Once you test locally, share:

1. **Console log output** showing plan_tier = undefined
2. **Network tab screenshot** showing which endpoints were called
3. **Supabase screenshot** showing the created subscription
4. **Confirmation that you see the bug**

Then we'll apply the fix and test again! 🎯
