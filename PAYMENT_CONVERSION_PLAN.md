# Payment Gateway & Currency Conversion Plan

## 📋 Overview

This document outlines the plan for implementing country-wise currency conversion with dual payment gateways (Razorpay for India, PayAid for International).

---

## 🎯 Core Requirements

### **1. Frontend Display**
- ✅ Show base EUR pricing: Free (€0), Basic (€5), Premium (€20)
- ✅ Display converted amount based on user's country
- ✅ Show which payment gateway will be used (Razorpay/PayAid)

### **2. Payment Gateway Selection**
- ✅ **India** → Razorpay
- ✅ **All Other Countries** → PayAid

### **3. Admin Dashboard - Financial Tab**
- ✅ Admin sets country-wise conversion rates
- ✅ Conversion rates stored per country
- ✅ Can update rates anytime (doesn't affect existing subscriptions)

### **4. Subscription Amount Locking**
- ✅ When user subscribes, the converted amount is locked
- ✅ Auto-pay/mandate uses the locked amount
- ✅ Admin rate changes don't affect existing subscriptions
- ✅ Only new subscriptions use updated rates

### **5. Currency Conversion Logic**
- ✅ **India**: Admin sets INR conversion → Razorpay charges in INR
- ✅ **Other Countries**: Admin sets conversion → PayAid charges in converted currency
- ✅ User's bank handles final conversion to local currency

---

## 📊 What Needs to Be Done

### **Phase 1: Database Schema**

#### **1.1 Create Currency Conversion Table**
```sql
CREATE TABLE country_currency_conversions (
    id UUID PRIMARY KEY,
    country VARCHAR(100) NOT NULL UNIQUE,
    currency_code VARCHAR(3) NOT NULL, -- INR, USD, GBP, etc.
    eur_to_local_rate DECIMAL(10,4) NOT NULL, -- Conversion rate from EUR
    payment_gateway VARCHAR(20) NOT NULL, -- 'razorpay' or 'payaid'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Fields:**
- `country` - Country name (e.g., "India", "United States")
- `currency_code` - Currency code (INR, USD, GBP, etc.)
- `eur_to_local_rate` - Conversion rate (e.g., 90.5 means €1 = ₹90.5)
- `payment_gateway` - Which gateway to use for this country
- `is_active` - Enable/disable conversion for country

#### **1.2 Update User Subscriptions Table**
```sql
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS locked_amount DECIMAL(10,2);
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS locked_currency VARCHAR(3);
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS conversion_rate_used DECIMAL(10,4);
```

**Purpose:**
- Store the amount user actually paid (converted amount)
- Store currency they paid in
- Store conversion rate used at time of subscription

---

### **Phase 2: Admin Dashboard - Financial Tab**

#### **2.1 Create Currency Conversion Manager Component**
**File:** `components/admin/CurrencyConversionManager.tsx`

**Features:**
- List all countries with conversion rates
- Add new country conversion
- Edit existing conversion rates
- Enable/disable conversions
- View conversion history

**UI Sections:**
1. **Country List Table**
   - Country name
   - Currency code
   - Conversion rate (EUR to Local)
   - Payment Gateway
   - Status (Active/Inactive)
   - Actions (Edit, Delete)

2. **Add/Edit Form**
   - Country selector/dropdown
   - Currency code input
   - Conversion rate input
   - Payment gateway selector (auto-set based on country)
   - Active/Inactive toggle

3. **Conversion Calculator**
   - Show example: €5 Basic Plan = ? in local currency
   - Real-time calculation as admin types rate

#### **2.2 Default Conversion Rates**
**Pre-populate common countries:**
- India: INR, Rate: 90.0, Gateway: Razorpay
- United States: USD, Rate: 1.10, Gateway: PayAid
- United Kingdom: GBP, Rate: 0.85, Gateway: PayAid
- etc.

---

### **Phase 3: Frontend Subscription Page**

#### **3.1 Update Subscription Display**
**File:** `components/startup-health/StartupSubscriptionPage.tsx`

**Changes Needed:**
1. **Detect User Country**
   - Get country from user profile
   - Determine payment gateway (India → Razorpay, Others → PayAid)

2. **Fetch Conversion Rate**
   - Query `country_currency_conversions` table
   - Get conversion rate for user's country
   - If no conversion exists, use EUR (default)

3. **Display Pricing**
   - Show base EUR price: "€5/month"
   - Show converted price: "₹450/month (India)"
   - Show payment gateway: "Pay with Razorpay" or "Pay with PayAid"

4. **Price Calculation**
   ```typescript
   const basePriceEUR = 5; // Basic plan
   const conversionRate = 90; // From admin settings
   const convertedPrice = basePriceEUR * conversionRate; // ₹450
   ```

#### **3.2 Payment Processing**
- Use converted amount (not EUR) for payment
- Store locked amount in subscription record
- Set up auto-pay with locked amount

---

### **Phase 4: Payment Service Updates**

#### **4.1 Update Payment Service**
**File:** `lib/paymentService.ts`

**New Functions:**
1. `getConvertedPrice(planId, country)` - Get converted price for country
2. `lockSubscriptionAmount(userId, amount, currency, rate)` - Lock amount
3. `processPaymentWithConversion(plan, userId, country)` - Process with conversion

**Payment Flow:**
1. User selects plan
2. System detects country
3. Fetches conversion rate from admin settings
4. Calculates converted amount
5. Processes payment with converted amount
6. Stores locked amount in subscription
7. Sets up auto-pay with locked amount

#### **4.2 Razorpay Integration (India)**
- Use converted INR amount
- Process payment in INR
- Store locked amount in INR

#### **4.3 PayAid Integration (International)**
- Use converted amount (could be USD, GBP, etc.)
- Process payment in converted currency
- Store locked amount in converted currency

---

### **Phase 5: Auto-Pay/Mandate Management**

#### **5.1 Subscription Locking Logic**
**When user subscribes:**
```typescript
{
  plan_id: "basic-plan-id",
  base_price_eur: 5.00,
  country: "India",
  conversion_rate: 90.0,
  locked_amount: 450.00,
  locked_currency: "INR",
  payment_gateway: "razorpay"
}
```

**Auto-pay behavior:**
- Always charge `locked_amount` in `locked_currency`
- Never recalculate even if admin changes rate
- Only new subscriptions use new rates

#### **5.2 Webhook Handling**
- Both Razorpay and PayAid webhooks
- Verify payment success
- Update subscription status
- Ensure locked amount matches payment

---

## 💡 Suggestions & Improvements

### **Suggestion 1: Conversion Rate History**
**Why:** Track rate changes for audit purposes

**Implementation:**
```sql
CREATE TABLE currency_conversion_history (
    id UUID PRIMARY KEY,
    country VARCHAR(100),
    old_rate DECIMAL(10,4),
    new_rate DECIMAL(10,4),
    changed_by UUID, -- Admin user ID
    changed_at TIMESTAMP,
    reason TEXT
);
```

### **Suggestion 2: Rate Update Notifications**
**Why:** Inform admins when rates change significantly

**Implementation:**
- Alert if rate change > 10%
- Log all rate changes
- Show impact on existing subscriptions

### **Suggestion 3: Fallback Mechanism**
**Why:** Handle countries without conversion rates

**Implementation:**
- If no conversion rate exists → Use EUR
- Show warning: "Pricing in EUR, your bank will convert"
- Allow admin to add conversion later

### **Suggestion 4: Multi-Currency Support in Admin**
**Why:** Support multiple currencies per country

**Implementation:**
- Some countries might want USD instead of local currency
- Allow admin to choose preferred currency
- Example: India could use USD if needed

### **Suggestion 5: Rate Validation**
**Why:** Prevent invalid conversion rates

**Implementation:**
- Validate rate is > 0
- Validate rate is reasonable (not 0.001 or 1000000)
- Warn if rate seems incorrect
- Compare with market rates (optional)

### **Suggestion 6: Bulk Rate Updates**
**Why:** Update multiple countries at once

**Implementation:**
- CSV import for bulk updates
- Apply percentage change to multiple countries
- Preview changes before applying

### **Suggestion 7: Subscription Upgrade/Downgrade**
**Why:** Handle plan changes with locked amounts

**Implementation:**
- When user upgrades/downgrades:
  - Calculate new converted amount using current rate
  - Lock new amount
  - Prorate if needed

### **Suggestion 8: Display Original EUR Price**
**Why:** Transparency for users

**Implementation:**
- Show: "€5/month (₹450/month in India)"
- Help users understand base pricing
- Show conversion rate used

---

## 🔄 Workflow Example

### **Scenario: User from India Subscribes to Basic Plan**

1. **User visits subscription page**
   - System detects: Country = "India"
   - System determines: Gateway = "Razorpay"

2. **Fetch conversion rate**
   - Query: `SELECT * FROM country_currency_conversions WHERE country = 'India'`
   - Result: Rate = 90.0, Currency = "INR"

3. **Calculate price**
   - Base: €5
   - Converted: €5 × 90 = ₹450

4. **Display to user**
   - "Basic Plan: €5/month"
   - "You'll pay: ₹450/month (India)"
   - "Payment via: Razorpay"

5. **User subscribes**
   - Payment processed: ₹450 via Razorpay
   - Subscription created with:
     - `locked_amount = 450.00`
     - `locked_currency = "INR"`
     - `conversion_rate_used = 90.0`

6. **Auto-pay setup**
   - Razorpay mandate created for ₹450/month
   - Future charges: Always ₹450 (even if admin changes rate to 95)

7. **Admin changes rate later**
   - New rate: 95.0
   - Existing subscriptions: Still charge ₹450 ✅
   - New subscriptions: Will charge ₹475 (€5 × 95) ✅

---

## 📝 Implementation Checklist

### **Database**
- [ ] Create `country_currency_conversions` table
- [ ] Add `locked_amount`, `locked_currency`, `conversion_rate_used` to `user_subscriptions`
- [ ] Create indexes for performance
- [ ] Set up RLS policies

### **Admin Dashboard**
- [ ] Create Currency Conversion Manager component
- [ ] Add "Currency Conversions" section in Financial tab
- [ ] Implement CRUD operations for conversions
- [ ] Add conversion calculator
- [ ] Pre-populate common countries

### **Frontend**
- [ ] Update subscription page to detect country
- [ ] Fetch and display converted prices
- [ ] Show payment gateway indicator
- [ ] Update payment processing to use converted amount

### **Backend Services**
- [ ] Update payment service with conversion logic
- [ ] Implement amount locking
- [ ] Update Razorpay integration for INR
- [ ] Update PayAid integration for multi-currency
- [ ] Handle webhooks with locked amounts

### **Testing**
- [ ] Test India subscription flow (Razorpay + INR)
- [ ] Test international subscription flow (PayAid + other currencies)
- [ ] Test rate changes don't affect existing subscriptions
- [ ] Test auto-pay with locked amounts
- [ ] Test countries without conversion rates

---

## ⚠️ Important Considerations

### **1. Rate Accuracy**
- Admin must keep rates updated
- Consider auto-fetching rates from API (optional)
- Allow manual override for business reasons

### **2. Currency Fluctuations**
- Rates change daily
- Locked amounts protect users from increases
- But users also don't benefit from decreases
- Consider: Allow rate updates for existing subscriptions (optional feature)

### **3. Payment Gateway Currency Support**
- Verify Razorpay supports INR
- Verify PayAid supports multiple currencies
- Handle unsupported currencies gracefully

### **4. Legal/Compliance**
- Display terms: "Amount locked at time of subscription"
- Show conversion rate used
- Comply with local payment regulations

### **5. User Experience**
- Clear pricing display
- Show both EUR and converted amount
- Explain why amount is locked
- Provide currency conversion calculator

---

## ✅ Summary

**Your plan is correct!** Here's what will happen:

1. ✅ Frontend shows EUR base prices
2. ✅ Admin sets country-wise conversion rates
3. ✅ Users see converted prices based on their country
4. ✅ Payment processed in converted currency
5. ✅ Amount locked at subscription time
6. ✅ Auto-pay uses locked amount
7. ✅ Admin rate changes only affect new subscriptions

**The flow is solid!** The only suggestions are:
- Add rate history tracking
- Add fallback for countries without rates
- Consider bulk rate updates
- Add validation for rates

Ready to implement when you are! 🚀

---

**Document Version**: 1.0  
**Status**: Planning Complete - Ready for Implementation
