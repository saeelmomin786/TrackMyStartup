# Investor Advisor Credit System - Complete Flow

## 📋 Overview
Investor advisors can buy credits in bulk and assign them to startups. Each credit provides 1 month of Premium subscription. The system supports auto-renewal when toggle is ON and credits are available.

---

## 🔄 Complete Flow

### **Phase 1: Credit Purchase**

#### Step 1.1: Advisor Navigates to Credits Section
- Advisor goes to dashboard → "Credits" tab/section
- System displays:
  - Available credits count
  - Credits used count
  - Total credits purchased
  - Purchase history table

#### Step 1.2: Advisor Selects Credit Package
- Options displayed: 1, 5, 10, 20 credits (or custom amounts)
- Price per credit: €20 (or configured price)
- Bulk discounts may apply
- Advisor selects quantity

#### Step 1.3: Payment Processing
- System determines payment gateway (Razorpay/PayAid) based on advisor's country
- Advisor completes payment
- On success:
  - Credits added to advisor's account
  - `credits_available` incremented
  - Purchase recorded in history
- On failure:
  - Show error message
  - No credits added

---

### **Phase 2: Toggle ON - Initial Credit Assignment**

#### Step 2.1: Advisor Views "My Network" Section
- Table shows all startups under advisor
- Each row has:
  - Startup details (name, sector, etc.)
  - Premium Status column
  - Actions column with toggle switch

#### Step 2.2: Advisor Turns Toggle ON
- Advisor clicks toggle switch for a startup
- System checks:
  - ✅ Toggle state = ON
  - ✅ Advisor has available credits (`credits_available > 0`)
  - ✅ No active credit assignment exists for this startup

#### Step 2.3: Credit Assignment Process
**If credits available:**
1. Deduct 1 credit from advisor's account (`credits_available -= 1`, `credits_used += 1`)
2. Create `advisor_credit_assignments` record:
   - `start_date = NOW()`
   - `end_date = NOW() + 1 month`
   - `status = 'active'`
   - `auto_renewal_enabled = true`
3. Create/Update `user_subscriptions` record for startup:
   - `plan_tier = 'premium'`
   - `paid_by_advisor_id = [advisor_user_id]`
   - `status = 'active'`
   - `current_period_start = NOW()`
   - `current_period_end = NOW() + 1 month`
4. Grant Premium access to startup
5. Hide Account tab from startup dashboard
6. Update UI: Show "Premium Active - Expires: [date] (Auto-renewal ON)"

**If no credits available:**
1. Show message: "No credits available. Please buy credits first."
2. Option to redirect to Credits purchase page
3. Toggle remains OFF

---

### **Phase 3: Startup Experience During Active Credit**

#### Step 3.1: Startup Dashboard Access
- Startup logs into dashboard
- System checks `user_subscriptions`:
  - Finds active Premium subscription
  - Checks `paid_by_advisor_id` is not null
  - Verifies `current_period_end > NOW()`

#### Step 3.2: UI Behavior
- **Account Tab:** Hidden (not visible in navigation)
- **Payment Options:** Hidden (no subscription management visible)
- **Premium Features:** All enabled and accessible
- **Banner/Message:** "Premium access provided by [Advisor Name] until [Expiry Date]"

#### Step 3.3: Feature Access
- All Premium plan features work normally:
  - Portfolio fundraising
  - Grants draft + CRM
  - AI investor matching
  - CRM access
  - Active fundraising campaigns
  - 10 GB storage

---

### **Phase 4: Auto-Renewal Process (Daily Job)**

#### Step 4.1: Daily Job Execution
- Scheduled job runs daily (e.g., midnight)
- Queries all active credit assignments:
  - `status = 'active'`
  - `auto_renewal_enabled = true`
  - `end_date <= NOW() + 1 day` (expiring today or tomorrow)

#### Step 4.2: For Each Expiring Assignment
**Check conditions:**
1. Toggle still ON? (`auto_renewal_enabled = true`)
2. Advisor has available credits? (`credits_available > 0`)
3. Credit expired or expiring? (`end_date <= NOW()`)

**If all conditions met:**
1. Deduct 1 credit from advisor's account
2. Mark old assignment as expired:
   - `status = 'expired'`
   - `expired_at = NOW()`
3. Create new assignment:
   - `start_date = [previous end_date]`
   - `end_date = [start_date + 1 month]`
   - `status = 'active'`
   - `auto_renewal_enabled = true`
4. Update `user_subscriptions`:
   - `current_period_start = [new start_date]`
   - `current_period_end = [new end_date]`
   - `status = 'active'`
5. Premium access continues seamlessly

**If toggle ON but no credits:**
1. Mark assignment as expired (natural expiry)
2. Update `user_subscriptions`:
   - `status = 'inactive'` or `'cancelled'`
3. Stop auto-renewal (assignment expires)
4. Notify advisor: "Auto-renewal paused for [Startup Name] - No credits available"
5. Update UI: Show "Premium Expired - Auto-renewal paused (No credits)"

**If toggle OFF:**
1. Mark assignment as expired (natural expiry)
2. Update `user_subscriptions`:
   - `status = 'inactive'` or `'cancelled'`
3. No new credit assigned
4. Auto-renewal stopped

---

### **Phase 5: Credit Expiry (No Auto-Renewal)**

#### Step 5.1: Credit Expires
- `end_date` has passed
- No auto-renewal (toggle OFF or no credits)
- Daily job marks assignment as expired

#### Step 5.2: Subscription Deactivation
1. Update `user_subscriptions`:
   - `status = 'inactive'` or `'cancelled'`
   - Keep `paid_by_advisor_id` for history
2. Revoke Premium access from startup
3. Downgrade to Free plan (or restore startup's own subscription if exists)

#### Step 5.3: Startup Dashboard Changes
- **Account Tab:** Now visible
- **Payment Options:** Visible (unless hidden by advisor checkbox)
- **Premium Features:** Disabled
- **Banner/Message:** "Premium access expired. Contact your advisor or subscribe yourself."

---

### **Phase 6: Toggle OFF**

#### Step 6.1: Advisor Turns Toggle OFF
- Advisor clicks toggle switch (currently ON)
- Confirmation not required (or optional modal)

#### Step 6.2: System Actions
1. Update `advisor_credit_assignments`:
   - `auto_renewal_enabled = false`
2. **Important:** Current credit remains active until `end_date`
3. No immediate cancellation - credit expires naturally
4. Update UI: Show "Premium Active - Expires: [date] (Auto-renewal OFF)"

#### Step 6.3: After Current Credit Expires
- Follow Phase 5 flow (Credit Expiry)
- Startup loses Premium access
- Account tab becomes visible

---

### **Phase 7: Manual Credit Re-assignment**

#### Step 7.1: Advisor Manually Assigns Credit
- Toggle is OFF or credit expired
- Advisor has available credits
- Advisor clicks "Assign Credit" button (or turns toggle ON)

#### Step 7.2: Assignment Process
- Same as Phase 2.3 (Credit Assignment Process)
- Creates new assignment
- Grants Premium access
- If toggle was OFF, turning it ON enables auto-renewal

---

## 🎯 Key Logic Rules

### **Toggle State = Auto-Renewal Intent**
- Toggle ON = "I want this startup on Premium continuously"
- Toggle OFF = "Stop auto-renewal after current credit expires"
- Toggle state persists even if credits run out

### **Credit Assignment Priority**
1. Check if advisor has credits available
2. Check if startup already has active credit
3. If both true → assign credit
4. If no credits → pause auto-renewal, notify advisor

### **Subscription Status Logic**
- System checks `user_subscriptions` table for Premium access
- `paid_by_advisor_id` indicates advisor-paid subscription
- `status = 'active'` AND `current_period_end > NOW()` = Premium active
- When checking access, prioritize advisor-paid subscriptions

### **Account Tab Visibility**
- Hide Account tab if:
  - `user_subscriptions` exists for startup
  - `status = 'active'`
  - `paid_by_advisor_id` is not null
  - `current_period_end > NOW()`
- Show Account tab if:
  - No active subscription, OR
  - Subscription expired/cancelled, OR
  - `paid_by_advisor_id` is null (startup's own subscription)

---

## 📊 Status Indicators

### **Advisor Dashboard - My Network Table**

| Status | Display | Meaning |
|--------|---------|---------|
| Toggle ON, Credit Active | "Premium Active - Expires: DD/MM/YYYY (Auto-renewal ON)" | Premium active, will auto-renew |
| Toggle ON, Credit Expired, Credits Available | "Premium Expired - Renewing..." | Auto-renewal in progress |
| Toggle ON, Credit Expired, No Credits | "Premium Expired - Auto-renewal paused (No credits)" | Need to buy credits |
| Toggle OFF, Credit Active | "Premium Active - Expires: DD/MM/YYYY (Auto-renewal OFF)" | Premium active, won't renew |
| Toggle OFF, No Credit | "No Premium (Toggle OFF)" | No premium access |

### **Startup Dashboard**

| Status | Account Tab | Payment Options | Premium Features |
|--------|------------|-----------------|-------------------|
| Credit Active | Hidden | Hidden | Enabled |
| Credit Expired | Visible | Visible* | Disabled |

*Payment options visible unless advisor has hidden them via checkbox

---

## 🔔 Notifications & Alerts

### **Advisor Notifications**
1. **Credit Purchase Success:** "X credits added to your account"
2. **Credit Assignment Success:** "1 credit assigned to [Startup Name] - Premium active until [date]"
3. **Auto-Renewal Success:** "Premium auto-renewed for [Startup Name] - Active until [date]"
4. **Auto-Renewal Paused:** "Auto-renewal paused for [Startup Name] - No credits available. Buy credits to continue."
5. **Low Credits Warning:** "You have less than 5 credits remaining"

### **Startup Notifications**
1. **Premium Activated:** "Premium access provided by [Advisor Name] until [date]"
2. **Premium Expiring Soon:** "Your Premium access expires in 3 days"
3. **Premium Expired:** "Premium access expired. Contact your advisor or subscribe yourself."

---

## 🔄 State Transitions

### **Toggle ON → Credit Assignment**
```
Toggle OFF + No Credit
    ↓ (Toggle ON + Credits Available)
Toggle ON + Credit Active (1 month)
    ↓ (After 1 month + Toggle ON + Credits Available)
Toggle ON + Credit Active (Extended 1 month)
    ↓ (Repeat monthly if toggle ON and credits available)
```

### **Toggle ON → No Credits**
```
Toggle ON + Credit Active
    ↓ (After 1 month + No Credits)
Toggle ON + Credit Expired + Auto-renewal Paused
    ↓ (Advisor Buys Credits)
Toggle ON + Credit Active (Auto-renewal resumes)
```

### **Toggle OFF**
```
Toggle ON + Credit Active
    ↓ (Toggle OFF)
Toggle OFF + Credit Active (until expiry)
    ↓ (After expiry)
Toggle OFF + No Credit
```

---

## ✅ Flow Validation Checklist

- [x] Advisor can buy credits in bulk
- [x] Credits are stored and tracked per advisor
- [x] Toggle ON assigns credit immediately (if available)
- [x] Credit assignment creates Premium subscription in `user_subscriptions`
- [x] Startup gets Premium access, Account tab hidden
- [x] Auto-renewal works when toggle ON and credits available
- [x] Auto-renewal pauses when no credits (toggle remains ON)
- [x] Toggle OFF stops auto-renewal (current credit expires naturally)
- [x] Credit expiry revokes Premium access
- [x] Account tab appears after credit expiry
- [x] System handles edge cases (no credits, toggle changes, etc.)

---

## 🎯 Summary

**Simple Flow:**
1. Advisor buys credits → Credits stored
2. Toggle ON → Assign 1 credit → Premium active (1 month)
3. Monthly: If toggle ON + credits available → Auto-assign credit → Extend Premium
4. If toggle OFF or no credits → Credit expires → Premium ends → Account tab visible

**Key Principle:** Toggle = Auto-renewal intent. System automatically assigns credits monthly when toggle is ON and credits are available.
