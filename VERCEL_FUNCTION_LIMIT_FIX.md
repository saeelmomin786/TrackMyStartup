# ⚠️ Vercel Function Limit - Hobby Plan (12 Functions Max)

## ❌ The Error

```
Error: No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan.
```

## 🔍 Current Situation

**You have 14 API functions:**
1. `api/prerender.ts` ✅ (NEW - needed for SSR)
2. `api/crawler-detector.ts` ⚠️ (Can be removed - not essential)
3. `api/sitemap.xml.ts` ✅ (Essential for SEO)
4. `api/razorpay/verify.ts` ✅ (Payment processing)
5. `api/razorpay/create-order.ts` ✅ (Payment processing)
6. `api/razorpay/create-subscription.ts` ✅ (Payment processing)
7. `api/billing/subscription-status.ts` ✅ (Billing)
8. `api/verify-otp.ts` ✅ (Authentication)
9. `api/request-otp.ts` ✅ (Authentication)
10. `api/send-invite.ts` ✅ (Invitations)
11. `api/invite-startup-advisor.ts` ✅ (Invitations)
12. `api/invite-startup-mentor.ts` ✅ (Invitations)
13. `api/invite-investor-advisor.ts` ✅ (Invitations)
14. `api/google-calendar.ts` ✅ (Calendar integration)

**Total: 14 functions (2 over limit)**

---

## ✅ Solutions

### **Solution 1: Remove Non-Essential Functions (Recommended)**

**Remove `api/crawler-detector.ts`** - It's not essential, just a utility:
- The prerender API can detect crawlers internally
- Saves 1 function

**Result:** 13 functions (still 1 over limit)

### **Solution 2: Combine Invite Functions**

Combine the 3 invite functions into 1:
- `invite-startup-advisor.ts`
- `invite-startup-mentor.ts`
- `invite-investor-advisor.ts`

**Into:** `api/invite.ts` (single function with type parameter)

**Result:** 12 functions ✅ (exactly at limit)

### **Solution 3: Exclude Functions from Deployment**

Use `vercel.json` to exclude non-critical functions from deployment.

### **Solution 4: Upgrade to Pro Plan**

Upgrade to Vercel Pro plan ($20/month) for unlimited functions.

---

## 🎯 Recommended Action

**Combine the 3 invite functions into 1** + **Remove crawler-detector**:

1. **Remove:** `api/crawler-detector.ts` (not essential)
2. **Combine:** 3 invite functions → 1 `api/invite.ts`

**Result:** 12 functions (exactly at limit) ✅

---

## 📝 Implementation

I'll:
1. ✅ Fix TypeScript errors in `sitemap.xml.ts`
2. ✅ Remove `api/crawler-detector.ts`
3. ✅ Combine invite functions (if needed)

**This will get you to exactly 12 functions!**

