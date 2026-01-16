# Quick Answer Guide: Form 2 → Dashboard → Plan Selection

## ❓ Q1: After Registration Form 2, What is Shown?

### 📋 Answer:
**Subscription Plans Page** is displayed immediately after Form 2 completion.

**What the user sees:**
```
┌────────────────────────────────────────────┐
│  Choose a Plan to Unlock Premium Features  │
├────────────────────────────────────────────┤
│                                            │
│  ┌────────────┐  ┌────────────┐           │
│  │    FREE    │  │   BASIC    │           │
│  │    €0      │  │  €5/month  │           │
│  │            │  │            │           │
│  │ Dashboard  │  │ All FREE + │           │
│  │ Financial  │  │ • CRM      │           │
│  │ Compliance │  │ • Portfolio│           │
│  │ Profile    │  │ • Grants   │           │
│  │            │  │ • AI Match │           │
│  │ ❌ No CRM  │  │ • More...  │           │
│  │ ❌ No Port │  │            │           │
│  └────────────┘  └────────────┘           │
│                                            │
│  ┌────────────────────────────┐           │
│  │       PREMIUM               │           │
│  │       €20/month             │           │
│  │                             │           │
│  │  ✅ All Features Unlocked   │           │
│  │  • Active Fundraising       │           │
│  │  • Fund Utilization Report  │           │
│  │  • 10 GB Storage            │           │
│  │                             │           │
│  └────────────────────────────┘           │
│                                            │
│  [Select Plan]  [View Full Comparison]    │
│                                            │
└────────────────────────────────────────────┘
```

**Component:** `components/SubscriptionPlansPage.tsx`

**Triggered By:** After user completes Form 2 in `CompleteRegistrationPage.tsx`
- All documents uploaded
- Profile data saved
- User profile marked as complete
- Then: `onNavigateToDashboard()` → App.tsx sets `currentPage = 'subscription'`

---

## ❓ Q2: How is the Startup Dashboard Locked?

### 📋 Answer:
**Feature Access Control System** locks dashboard features based on subscription plan.

### **How It Works (3 Components):**

#### **1️⃣ FeatureGuard Component**
Wraps features that need access control:
```typescript
<FeatureGuard feature="portfolio_fundraising">
  <PortfolioFundraisingSection />
</FeatureGuard>

<FeatureGuard feature="crm_access">
  <CRMDashboard />
</FeatureGuard>
```

#### **2️⃣ Feature Access Check**
When user tries to access a feature:
```typescript
// FeatureGuard calls:
const hasAccess = await featureAccessService.canAccessFeature(
  userId,
  'portfolio_fundraising'  // feature name
);

// Service queries database:
SELECT is_enabled FROM plan_features
WHERE plan_tier = (
  SELECT plan_tier FROM subscriptions WHERE user_id = ?
)
AND feature_name = 'portfolio_fundraising'
```

**Result:** `is_enabled = true/false`

#### **3️⃣ Conditional Rendering**
```typescript
if (hasAccess) {
  // Show feature content
  return <PortfolioFundraisingSection />;
} else {
  // Show upgrade prompt
  return (
    <UpgradePrompt 
      feature="portfolio_fundraising"
      currentPlan="free"
      requiredPlan="basic"
    />
  );
}
```

### **The Locking Database**

Table: `plan_features`
```
┌────────┬──────────────────────┬────────────┐
│ Tier   │ Feature              │ Locked?    │
├────────┼──────────────────────┼────────────┤
│ free   │ portfolio_fundraising│ YES ❌     │
│ basic  │ portfolio_fundraising│ NO ✅      │
│ premium│ portfolio_fundraising│ NO ✅      │
├────────┼──────────────────────┼────────────┤
│ free   │ crm_access           │ YES ❌     │
│ basic  │ crm_access           │ NO ✅      │
│ premium│ crm_access           │ NO ✅      │
├────────┼──────────────────────┼────────────┤
│ free   │ fundraising_active   │ YES ❌     │
│ basic  │ fundraising_active   │ YES ❌     │
│ premium│ fundraising_active   │ NO ✅      │
└────────┴──────────────────────┴────────────┘
```

### **What Gets Locked?**

**FREE PLAN (€0):**
- ✅ Dashboard
- ✅ Financials
- ✅ Compliance
- ✅ Profile
- ❌ **Portfolio Fundraising** (locked)
- ❌ **Grants Draft** (locked)
- ❌ **Investor CRM** (locked)
- ❌ **AI Investor Matching** (locked)
- ❌ **Active Fundraising** (locked)

**BASIC PLAN (€5/month):**
- ✅ All Free features
- ✅ **Portfolio Fundraising**
- ✅ **Grants Draft**
- ✅ **Investor CRM**
- ✅ **AI Investor Matching**
- ❌ **Active Fundraising** (premium only)

**PREMIUM PLAN (€20/month):**
- ✅ **Everything unlocked**
- ✅ Active Fundraising
- ✅ 10 GB storage

---

## ❓ Q3: How Does Plan Selection Work?

### 📋 Answer:
**Complete Plan Selection & Payment Flow**

### **Step 1: User Selects Plan**
On Subscription Plans page, user clicks plan:
```
FREE PLAN
[Select]
  ↓
No payment needed
Instantly save to database
  ↓
Go to Dashboard

BASIC/PREMIUM PLAN
[Upgrade Now]
  ↓
Payment Gateway Selection
  ↓
Process Payment
```

### **Step 2: Payment Processing (For Basic/Premium)**
```
1. Detect user's country
   ↓
2. Select payment gateway
   • Stripe (Global, EU)
   • Razorpay (India)
   • Local gateway
   ↓
3. Show payment form with local currency
   • Global: €
   • India: ₹
   • USA: $
   ↓
4. User enters payment details
   ↓
5. Payment processed
   ✅ Success → Save to database
   ❌ Failed → Show error, retry
```

### **Step 3: Save Subscription to Database**
When payment succeeds (or Free selected):
```sql
INSERT INTO subscriptions (
  user_id,
  plan_id,
  plan_tier,           -- 'free', 'basic', 'premium'
  current_period_start,-- NOW()
  current_period_end,  -- NOW() + 1 month or 1 year
  payment_status,      -- 'paid' or 'unpaid'
  auto_renew,         -- true/false
  created_at,
  updated_at
) VALUES (...)
```

**Result in database:**
```
┌──────────┬──────────┬──────────────────────┐
│ user_id  │ plan_tier│ current_period_end   │
├──────────┼──────────┼──────────────────────┤
│user-123  │ 'basic'  │ 2024-02-16           │
└──────────┴──────────┴──────────────────────┘
```

### **Step 4: Features Unlocked**
Now when user accesses features:
```
1. FeatureGuard checks: plan_tier = 'basic'
2. Query: is_enabled WHERE plan_tier='basic' AND feature='crm_access'
3. Result: true ✅
4. Show CRM content instead of lock message
```

### **Step 5: Redirect to Dashboard**
After plan selection/payment:
- Clear subscription page
- Redirect to main dashboard (`currentPage = 'login'`)
- Dashboard loads with FeatureGuard checks
- User sees unlocked features based on plan

---

## 🔄 Complete Flow Summary

```
┌─────────────────────────────────────────────────────────┐
│           COMPLETE REGISTRATION JOURNEY                │
└─────────────────────────────────────────────────────────┘

STEP 1: Form 1 (BasicRegistrationStep)
├─ Email, Password, Name, Role, Role-specific fields
└─ Click Next

STEP 2: Form 2 (CompleteRegistrationPage)
├─ Upload documents
├─ Enter profile data
├─ Save to database
└─ Click "Complete Registration"

STEP 3: Subscription Plans Page ← YOU ARE HERE
├─ Show Free/Basic/Premium options
├─ User selects plan
└─ Click "Upgrade Now" or "Select Free"

STEP 4: Payment (if Basic/Premium)
├─ Show payment gateway
├─ User enters payment details
├─ Process payment
└─ Save subscription to database

STEP 5: Main Dashboard
├─ Load startup data
├─ Apply FeatureGuard checks
├─ Show/hide features based on plan_tier
└─ User starts using platform
```

---

## 📁 Key Files for Each Part

| What | File | Purpose |
|------|------|---------|
| Form 2 | `components/CompleteRegistrationPage.tsx` | Registration completion form |
| Plan Selection | `components/SubscriptionPlansPage.tsx` | Show available plans |
| Feature Lock | `components/FeatureGuard.tsx` | Wrap locked features |
| Lock Message | `components/UpgradePrompt.tsx` | Show when feature locked |
| Payment | `components/PaymentPage.tsx` | Process payments |
| Access Check | `lib/featureAccessService.ts` | Check if user has access |
| Payment Gateway | `lib/paymentGatewaySelector.ts` | Select payment method by country |
| Main App | `App.tsx` | Route to subscription page after Form 2 |
| Feature Definitions | `database/plan_features_table.sql` | Define locked/unlocked features |

---

## 🎯 Key Insights

### **After Form 2:**
✅ User profile is complete
✅ Documents uploaded
✅ Subscription Plans page shown
🎪 **Plans: Free / Basic / Premium**

### **Dashboard Locking:**
✅ Uses `plan_features` table
✅ `FeatureGuard` component wraps features
✅ `featureAccessService` checks access
✅ Shows upgrade prompt if locked
✅ Auto-opens subscription page if clicked

### **Plan Selection:**
✅ Free: No payment, instant access
✅ Basic/Premium: Payment required
✅ Payment gateway varies by country
✅ Saved to `subscriptions` table
✅ Features unlocked automatically

---

## 💡 Example Scenario

**User: Alice (Startup)**

```
1. Completes Form 2
   ↓
2. Sees Subscription Plans page
   ├─ Free (€0)
   ├─ Basic (€5/month) ← Alice picks this
   └─ Premium (€20/month)
   
3. Clicks "Upgrade to Basic"
   ↓
4. Payment gateway appears (Stripe for EU)
   ├─ Price: €5
   ├─ Enters card details
   └─ Pays successfully
   
5. Subscription saved
   ├─ plan_tier = 'basic'
   ├─ current_period_end = 2024-03-16
   └─ payment_status = 'paid'
   
6. Redirected to dashboard
   ├─ Tries to access Portfolio Fundraising
   ├─ FeatureGuard checks: plan_tier='basic'
   ├─ Queries: is_enabled WHERE plan_tier='basic'
   ├─ Result: true ✅
   └─ Shows Portfolio Fundraising section

7. Alice can now:
   ✅ View all Basic features
   ✅ Access CRM
   ✅ Use grants draft
   ✅ AI investor matching
   ❌ Can't use Active Fundraising (Premium only)
```

---

## 🚀 Summary Answers

### **Q1: After Form 2?**
→ **Subscription Plans page** with Free/Basic/Premium options

### **Q2: How dashboard locked?**
→ **FeatureGuard component** checks `plan_features` table
→ If `is_enabled = false`, shows **UpgradePrompt**
→ Feature access based on user's `plan_tier`

### **Q3: Plan selection?**
→ User **selects plan** on Subscription page
→ If Free: **Instantly saved**, no payment
→ If Basic/Premium: **Payment gateway** → Process payment → Save subscription
→ After: **Features unlocked** based on `plan_tier`

---

✨ **You now have complete visibility into the post-registration flow!**
