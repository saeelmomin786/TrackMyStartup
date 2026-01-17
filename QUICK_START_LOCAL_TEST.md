# Quick Start: Local Testing

## 🚀 One-Command Setup

### Option 1: PowerShell (Recommended for Windows)

**Start Backend + Frontend in split terminals:**

```powershell
# Run this in PowerShell - it will open TWO terminals
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run server"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"
```

### Option 2: Manual (2 Terminals)

**Terminal 1 - Backend:**
```powershell
npm run server
```

**Terminal 2 - Frontend:**
```powershell
npm run dev
```

---

## ✅ Quick Verification

After servers start, check:

1. **Backend:** http://localhost:3001 - should show "API Server Running"
2. **Frontend:** http://localhost:5173 - your app loads
3. **Console:** No red errors

---

## 🧪 Quick Test for the Bug

1. Open http://localhost:5173
2. Login as startup user
3. Go to **Subscription** or **Pricing** page
4. Select any plan
5. Click **"Pay Now"** or **"Activate"**
6. Open **Browser Console** (F12)
7. Look for log showing `plan_tier: undefined`

**If you see `plan_tier: undefined` → BUG CONFIRMED!** ✅

---

## 🔍 What to Check

### In Browser Console (F12):
- [ ] Do you see: `plan_tier: undefined`?
- [ ] Which code path was used?
- [ ] Was `/api/payment/verify` called?

### In Supabase:
```sql
SELECT plan_tier, razorpay_subscription_id, payment_gateway
FROM user_subscriptions
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result:**
- `plan_tier = NULL` ← This is the bug!
- `razorpay_subscription_id = NULL` (if free subscription)
- `payment_gateway = NULL` (if free subscription)

---

## 🛠️ Ready to Fix?

Once bug is confirmed, see: **LOCAL_TESTING_SETUP.md** for the complete fix!

---

## 🆘 Troubleshooting

### Port Already in Use:
```powershell
# Find what's using port 3001
netstat -ano | findstr :3001

# Kill it
taskkill /PID <pid> /F
```

### Razorpay Not Loading:
- Check `.env` file has `RAZORPAY_KEY_ID=rzp_test_...`
- Use TEST keys, not live keys!
- Restart both servers after changing .env

### Can't See Console Logs:
- Press F12 in browser
- Click "Console" tab
- Refresh page
- Try again

---

## 📊 Success Criteria

✅ Both servers running
✅ App loads at localhost:5173
✅ Can login to startup account
✅ Can navigate to subscription page
✅ Console shows `plan_tier: undefined` ← **Bug confirmed!**

**Next:** Apply the fix and test again! 🎯
