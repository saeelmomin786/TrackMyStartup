# ⚠️ Vercel Function Limit Solution

## Current Status

**Functions:** 13 (after removing `crawler-detector.ts`)
**Limit:** 12 (Hobby plan)
**Need to reduce by:** 1 function

## ✅ Solution: Exclude One Function from Deployment

Since combining the invite functions would be complex, the simplest solution is to **exclude one function** from being deployed as a serverless function.

**Option 1: Move `send-invite.ts` to a different location** (if it's not critical)
**Option 2: Combine invite functions** (more complex, but cleaner)

## 🎯 Recommended: Use Vercel Ignore

Actually, Vercel doesn't have a built-in way to exclude functions. The best approach is:

1. **Move non-critical function outside `api/` folder** - but this breaks the API
2. **Combine functions** - best long-term solution
3. **Upgrade to Pro plan** - $20/month for unlimited functions

## ✅ Quick Fix: Delete One Non-Essential Function

Looking at the functions, `send-invite.ts` might be redundant if the other invite functions handle everything. Let me check if it's used.

**If not used, delete it to get to 12 functions.**

## 📝 Current Functions (13):

1. ✅ `api/prerender.ts` - NEW (needed for SSR)
2. ✅ `api/sitemap.xml.ts` - Essential for SEO
3. ✅ `api/razorpay/verify.ts` - Payment
4. ✅ `api/razorpay/create-order.ts` - Payment
5. ✅ `api/razorpay/create-subscription.ts` - Payment
6. ✅ `api/billing/subscription-status.ts` - Billing
7. ✅ `api/verify-otp.ts` - Auth
8. ✅ `api/request-otp.ts` - Auth
9. ✅ `api/send-invite.ts` - Invites
10. ✅ `api/invite-startup-advisor.ts` - Invites
11. ✅ `api/invite-startup-mentor.ts` - Invites
12. ✅ `api/invite-investor-advisor.ts` - Invites
13. ✅ `api/google-calendar.ts` - Calendar

**All seem essential!**

## 🎯 Best Solution: Upgrade to Pro Plan

For $20/month, you get:
- ✅ Unlimited serverless functions
- ✅ More bandwidth
- ✅ Better performance
- ✅ Team features

**This is the cleanest solution.**

## Alternative: Combine Invite Functions

I can combine the 3 invite functions into 1 `api/invite.ts` that handles all types based on a `type` parameter. This would reduce from 13 to 11 functions.

**Would you like me to:**
1. Combine invite functions (reduces to 11 functions) ✅
2. Or upgrade to Pro plan?

