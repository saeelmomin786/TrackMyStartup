# Post-Registration Form 2 Flow & Plan Selection Analysis

## 📋 Overview
This document explains what happens after users complete Form 2 (CompleteRegistrationPage) in the startup dashboard, how the dashboard is locked by plan tier, and how plan selection works.

---

## 🎯 Flow After Form 2 Completion

### **Step 1: Form 2 Submission**
When user submits Form 2 (CompleteRegistrationPage):
- Location: `components/CompleteRegistrationPage.tsx`
- Button: "Complete Registration" at bottom of form
- Handler: `handleSubmit()` function

### **Step 2: Data Processing**
The form processes:

**Files Uploaded:**
- Government ID (mandatory)
- Role-specific document (CA license, CS cert, etc.)
- For Investment Advisors: License + Company Logo
- Documents uploaded to cloud storage via `storageService`

**Profile Data Collected:**
- Country
- Company Type
- Registration Date
- Currency
- CA Service Code (if applicable)
- CS Service Code (if applicable)
- Investment Advisor Code (if applicable)
- Founder information (for Startups)
- Subsidiaries & International Operations data

**Database Updates:**
```typescript
// Updates user_profiles table with:
{
  government_id: governmentIdUrl,
  ca_license: roleSpecificUrl,
  verification_documents: [all_uploaded_files],
  country: profileData.country,
  company_type: profileData.companyType,
  registration_date: profileData.registrationDate,
  currency: profileData.currency,
  ca_service_code: profileData.caServiceCode,
  cs_service_code: profileData.csServiceCode,
  investment_advisor_code_entered: profileData.investmentAdvisorCode,
  is_profile_complete: true,  // ← KEY FLAG
  updated_at: NOW()
}
```

### **Step 3: Role-Specific Processing**

**For Startup Users:**
- Creates `startups` table record
- Creates founder records
- Sets investment type, sector, compliance status
- If advisor code provided → links to advisor
- If invited by advisor → auto-links to advisor's startup list
- If manually entered code → appears in advisor's pending requests

**For Investment Advisors:**
- Saves to `investment_advisor_profiles` table
- Stores: firm_name, website, geography (country)
- Logo URL saved

**For Other Roles (Investor, CA, CS, Mentor, Facilitator):**
- Profile data saved
- Documents verified
- Ready for dashboard access

---

## 🎯 What Gets Shown After Form 2

### **Navigation Flow**
```
Form 2 Completion
        ↓
  (handleSubmit() triggers onNavigateToDashboard())
        ↓
  App.tsx → currentPage = 'subscription'
        ↓
  🎪 **SUBSCRIPTION PLANS PAGE**
        ↓
  User selects plan (Free/Basic/Premium)
        ↓
  Plan saved to database
        ↓
  currentPage = 'login' (main dashboard)
```

### **After Form 2 - Subscription Plans Page**

**What's Shown:**
```
1. Header: "Choose a Plan to Unlock Premium Features"
2. Three Plan Cards:
   - Free Plan (€0)
     • Dashboard access
     • Financial tracking
     • Compliance management
     • Profile management
     • ❌ Locked: Portfolio fundraising, Grants, CRM, AI matching, etc.
   
   - Basic Plan (€5/month or country-specific pricing)
     • All free features PLUS:
     • ✅ Portfolio fundraising
     • ✅ Grants draft applications
     • ✅ Add grants to CRM
     • ✅ AI investor matching
     • ✅ Investor CRM
     • ✅ Full CRM access
     • ❌ Locked: Active fundraising (Premium only)
   
   - Premium Plan (€20/month or country-specific pricing)
     • ✅ ALL FEATURES INCLUDED
     • Active fundraising
     • Everything from Free + Basic
     • 10 GB storage

3. Feature Comparison Table showing all features by plan

4. Buttons:
   - "View Plans" / "Upgrade Now"
   - "Back"
   - "Sign Out"
```

**Component:** `components/SubscriptionPlansPage.tsx`

---

## 🔒 How Startup Dashboard is Locked by Plan

### **Feature Access Control System**

**1. Feature Guard Component**
```typescript
// Usage in components:
<FeatureGuard 
  feature="portfolio_fundraising"  // Feature name
  userId={currentUser.id}
  fallback={<UpgradePrompt ... />}
>
  {/* Content only shown if user has access */}
</FeatureGuard>
```

**2. How It Works:**
- User tries to access locked feature
- `FeatureGuard` calls `featureAccessService.canAccessFeature()`
- Service checks `plan_features` table:
  ```sql
  SELECT is_enabled FROM plan_features 
  WHERE plan_tier = 'free' 
  AND feature_name = 'portfolio_fundraising'
  -- Result: false (locked for free tier)
  ```
- If `is_enabled = false` → Shows `UpgradePrompt` instead

**3. Upgrade Prompt Component**
```
┌─────────────────────────────────────────┐
│  🔒 Premium Feature Locked              │
├─────────────────────────────────────────┤
│  "Portfolio Fundraising" is available   │
│  in the Basic Plan and above            │
│                                         │
│  Current Plan: Free                     │
│  Required Plan: Basic                   │
│                                         │
│  [Upgrade Now] [View Plans]             │
└─────────────────────────────────────────┘
```

### **Locked Features by Plan**

**Free Plan** (€0):
- ✅ Dashboard
- ✅ Financial tracking
- ✅ Compliance management
- ✅ Profile management
- ❌ Portfolio fundraising (Basic+)
- ❌ Grants draft (Basic+)
- ❌ Grants CRM (Basic+)
- ❌ AI investor matching (Basic+)
- ❌ Investor CRM (Basic+)
- ❌ CRM access (Basic+)
- ❌ Active fundraising (Premium)
- ❌ Fund utilization report (Premium)

**Basic Plan** (€5/month):
- ✅ All Free features
- ✅ Portfolio fundraising
- ✅ Grants draft
- ✅ Grants CRM
- ✅ AI investor matching
- ✅ Investor CRM
- ✅ CRM access
- ❌ Active fundraising (Premium)
- ❌ Fund utilization report (Premium)

**Premium Plan** (€20/month):
- ✅ All features unlocked
- ✅ Active fundraising
- ✅ Fund utilization report
- 10 GB storage

### **Database: plan_features Table**
```sql
CREATE TABLE plan_features (
  id UUID PRIMARY KEY,
  plan_tier VARCHAR(20),      -- 'free', 'basic', 'premium'
  feature_name VARCHAR(255),  -- 'portfolio_fundraising', etc.
  is_enabled BOOLEAN,         -- true/false
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Example rows:
('free', 'portfolio_fundraising', false)
('basic', 'portfolio_fundraising', true)
('premium', 'portfolio_fundraising', true)

('free', 'crm_access', false)
('basic', 'crm_access', true)
('premium', 'crm_access', true)
```

---

## 💳 Plan Selection & Payment Flow

### **Plan Selection Screen**

**When Shown:**
- Immediately after Form 2 completion
- Anytime user clicks "Upgrade" on locked feature

**Components:**
- `SubscriptionPlansPage.tsx` - Main plan display
- `UpgradePrompt.tsx` - Triggered when accessing locked features
- `PaymentPage.tsx` - Payment processing
- `PlanSelectionModal.tsx` - Plan selection modal

### **Plan Selection Process**

```
1. User sees plan cards (Free/Basic/Premium)
   ↓
2. User clicks "Upgrade" or selects plan
   ↓
3. For Free Plan:
   - No payment required
   - Save selection to subscriptions table
   - plan_tier = 'free'
   ↓
4. For Basic/Premium Plans:
   - Redirect to PaymentPage
   - Display payment gateway (Stripe, Razorpay, etc.)
   - Enter payment details
   - Payment processed
   ↓
5. On Payment Success:
   - Create subscription record in database
   - Set plan_tier = 'basic' or 'premium'
   - Set current_period_start & current_period_end
   - Save payment details
   ↓
6. Redirect to Dashboard
   - User can now access all paid features
   - Dashboard loads with FeatureGuard checks
   - All locked features now show content
```

### **Database: subscriptions Table**

When user selects/upgrades plan:
```sql
INSERT INTO subscriptions (
  user_id,              -- auth.users.id
  plan_id,              -- UUID from subscription_plans
  plan_tier,            -- 'free', 'basic', 'premium'
  current_period_start, -- NOW()
  current_period_end,   -- NOW() + 1 month/year
  payment_status,       -- 'unpaid', 'paid', 'failed'
  payment_method,       -- 'stripe', 'razorpay', etc.
  auto_renew,          -- true/false
  created_at,
  updated_at
) VALUES (...)
```

### **Payment Gateway Integration**

**Supported Gateways:**
- Stripe (Global, EU)
- Razorpay (India)
- Local gateways selected by country

**Country-Based Pricing:**
- Global: EUR (€)
- India: INR (₹)
- USA: USD ($)
- etc.

**Service:** `lib/paymentGatewaySelector.ts`
- Detects user's country
- Selects appropriate payment gateway
- Converts price to local currency

---

## 🔄 Complete Registration Workflow

```
┌─────────────────────────────────────────────────────┐
│  USER REGISTRATION FLOW                             │
└─────────────────────────────────────────────────────┘

1. LANDING PAGE
   ├─ User clicks "Register"
   └─ Navigate to TwoStepRegistration

2. FORM 1: BasicRegistrationStep
   ├─ Email
   ├─ Password
   ├─ Name
   ├─ Role (Startup, Investor, CA, CS, etc.)
   ├─ Role-specific fields (Startup name, Firm name, etc.)
   └─ Click "Next"

3. FORM 2: CompleteRegistrationPage
   ├─ Government ID upload
   ├─ Role-specific document upload
   ├─ Profile info:
   │  ├─ Country
   │  ├─ Company Type
   │  ├─ Registration Date
   │  └─ Currency
   ├─ Founder info (if Startup)
   └─ Click "Complete Registration"

4. DATABASE UPDATES
   ├─ Save to user_profiles
   ├─ Upload documents to cloud storage
   ├─ Create startup record (if Startup)
   └─ Set is_profile_complete = true

5. SUBSCRIPTION PLANS PAGE ← YOU ARE HERE
   ├─ Show Free/Basic/Premium plans
   └─ User selects plan

6. PAYMENT PROCESSING (if Basic/Premium)
   ├─ Redirect to PaymentPage
   ├─ Select payment method
   ├─ Enter payment details
   └─ Process payment

7. SAVE SUBSCRIPTION
   ├─ Create subscriptions table record
   ├─ Set plan_tier
   ├─ Save payment details
   └─ Send confirmation email

8. MAIN DASHBOARD
   ├─ Load startup dashboard
   ├─ Apply FeatureGuard locks based on plan_tier
   ├─ Show/hide features
   └─ Full access to unlocked features
```

---

## 🎯 Key Points Summary

### **After Form 2:**
1. ✅ User profile is saved
2. ✅ Documents uploaded
3. ✅ Profile marked as complete
4. ✅ User directed to Subscription Plans page
5. 🎪 **Plans shown: Free, Basic, Premium**

### **Dashboard Locking:**
1. Uses `plan_features` table to define feature access
2. `FeatureGuard` component wraps locked features
3. `UpgradePrompt` shows when accessing locked feature
4. Plan tier determined from `subscriptions` table

### **Plan Selection:**
1. User selects Free/Basic/Premium
2. If paid plan → payment page
3. Subscription saved to database
4. Feature access unlocked based on plan_tier
5. User redirected to dashboard

### **Feature Access Control:**
```typescript
// In components:
<FeatureGuard feature="portfolio_fundraising">
  {/* Only shown if user's plan_tier has is_enabled=true */}
</FeatureGuard>

// If locked:
<UpgradePrompt 
  feature="portfolio_fundraising"
  currentPlan="free"
/>
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `components/CompleteRegistrationPage.tsx` | Form 2 component |
| `components/SubscriptionPlansPage.tsx` | Plan selection screen |
| `components/FeatureGuard.tsx` | Lock/unlock features |
| `components/UpgradePrompt.tsx` | Show when locked |
| `components/PaymentPage.tsx` | Payment processing |
| `lib/featureAccessService.ts` | Check feature access |
| `lib/paymentGatewaySelector.ts` | Select payment gateway |
| `App.tsx` | Main routing logic |
| `database/plan_features_table.sql` | Feature definitions |

---

## 🚀 Flow Summary for Your Question

**Q: After Form 2, what is shown?**
A: **Subscription Plans Page** with Free/Basic/Premium options

**Q: How is startup dashboard locked?**
A: **FeatureGuard component** + **plan_features table** + **feature access checks**

**Q: For selecting the plan?**
A: **SubscriptionPlansPage component** → Select plan → Payment (if paid) → Save to subscriptions table → Unlock features
