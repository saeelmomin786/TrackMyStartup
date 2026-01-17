# ADVISOR CREDIT SYSTEM - VISUAL ARCHITECTURE

## 🏗️ SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         INVESTMENT ADVISOR FLOW                         │
└─────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: ADVISOR BUYS CREDITS (PayPal/Razorpay/PayAid)                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  User: John (advisor) [auth_user_id = abc123]                            │
│                                                                             │
│  1. Selects 5 credits @ $20 each = $100                                   │
│  2. Pays via PayPal/Razorpay                                              │
│  3. Payment verified by /api/payment/verify                               │
│  4. RPC: increment_advisor_credits()                                      │
│                                                                             │
│  Database Result:                                                         │
│  ┌─ advisor_credits ─────────────────────────────────┐                  │
│  │ advisor_user_id | credits_available | credits_used │                  │
│  │ abc123          │ 5                 │ 0             │                  │
│  └───────────────────────────────────────────────────┘                  │
│                                                                             │
│  ┌─ credit_purchase_history ──────────────────────────┐                  │
│  │ advisor_user_id | credits_purchased | amount_paid  │                  │
│  │ abc123          │ 5                  │ 100          │                  │
│  └───────────────────────────────────────────────────┘                  │
│                                                                             │
│  STATUS: ✅ Advisor has 5 credits ready to assign                        │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: ADVISOR VIEWS "MY STARTUPS" TABLE                                 │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Frontend loads:                                                           │
│  1. All startups assigned to John                                          │
│  2. For each startup: Check if has premium (via getPremiumStatusForStartup)│
│  3. Display toggle switches                                                │
│                                                                             │
│  Table Rows:                                                               │
│  ┌──────────────────────────────────────────────────────────────┐         │
│  │ Startup Name  │ Premium Status  │ Auto-Renewal │ Toggle       │         │
│  ├──────────────────────────────────────────────────────────────┤         │
│  │ TechCo        │ No Premium      │ N/A          │ [Toggle ON]  │         │
│  │ StartupX      │ Premium Active  │ ON           │ [Toggle OFF] │         │
│  │ FoodBiz       │ Premium* (Self) │ N/A          │ [DISABLED]   │         │
│  └──────────────────────────────────────────────────────────────┘         │
│                           ↑ Prevented from toggling                       │
│                                                                             │
│  STATUS: ✅ Advisor sees premium status for each startup                  │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: ADVISOR ASSIGNS CREDIT (Clicks Toggle ON)                         │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Scenario A: STARTUP HAS NO PREMIUM (TechCo)                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━         │
│                                                                             │
│  Frontend: handleToggleCreditAssignment(startupUserId='tech-co-profile')  │
│    ↓                                                                       │
│  Backend: assignCredit(advisor_id='abc123', startup_id='tech-co-profile') │
│    ↓                                                                       │
│  ✅ CONVERT: tech-co-profile → tech-co-auth-user-id (xyz789)            │
│    ↓                                                                       │
│  ✅ VERIFY: Query for existing premium                                   │
│    ├─ Table: user_subscriptions                                          │
│    ├─ Filter: user_id = 'tech-co-profile' (profile_id)                  │
│    ├─ Filter: status = 'active'                                          │
│    ├─ Filter: plan_tier = 'premium'                                      │
│    ├─ Filter: current_period_end > NOW()                                │
│    └─ Result: 0 rows (NO PREMIUM) → PROCEED ✅                           │
│    ↓                                                                       │
│  ✅ CHECK CREDITS: advisor has >= 1? YES → PROCEED                      │
│    ↓                                                                       │
│  ✅ CREATE ASSIGNMENT:                                                   │
│    INSERT INTO advisor_credit_assignments (                               │
│      advisor_user_id = 'abc123' (auth_user_id),                          │
│      startup_user_id = 'xyz789' (auth_user_id),    ← CORRECT NOW!      │
│      start_date = TODAY,                                                  │
│      end_date = TODAY + 1 MONTH,                                          │
│      status = 'active',                                                   │
│      auto_renewal_enabled = true                                          │
│    );                                                                      │
│    ↓                                                                       │
│  ✅ DEDUCT CREDIT:                                                       │
│    UPDATE advisor_credits SET                                             │
│      credits_available = 4,        -- 5-1                                 │
│      credits_used = 1              -- 0+1                                 │
│    WHERE advisor_user_id = 'abc123';                                     │
│    ↓                                                                       │
│  ✅ CREATE SUBSCRIPTION:                                                 │
│    INSERT INTO user_subscriptions (                                        │
│      user_id = 'tech-co-profile' (profile_id),     ← CORRECT            │
│      plan_tier = 'premium',                                              │
│      status = 'active',                                                   │
│      paid_by_advisor_id = 'abc123' (advisor auth_user_id),               │
│      current_period_start = TODAY,                                        │
│      current_period_end = TODAY + 1 MONTH                                │
│    );                                                                      │
│    ↓                                                                       │
│  ✅ RETURN SUCCESS                                                        │
│                                                                             │
│  Database Result:                                                         │
│  ┌─ advisor_credits ─────────────────────────────────┐                  │
│  │ abc123   │ credits_available=4 │ credits_used=1   │                  │
│  └───────────────────────────────────────────────────┘                  │
│  ┌─ advisor_credit_assignments ───────────────────────────────┐         │
│  │ abc123   │ xyz789    │ active │ true    │ TODAY │ +1MONTH │         │
│  └───────────────────────────────────────────────────────────┘         │
│  ┌─ user_subscriptions ────────────────────────────────────────┐        │
│  │ tech-co-profile │ premium │ active │ abc123 │ TODAY │ +1MONTH │     │
│  └────────────────────────────────────────────────────────────┘         │
│                                                                             │
│  STATUS: ✅ Credit assigned, subscription created                        │
│                                                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                                             │
│  Scenario B: STARTUP HAS SELF-PAID PREMIUM (FoodBiz)                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                                                             │
│  Frontend: Toggle is DISABLED (not visible) → Can't click ❌             │
│                                                                             │
│  (If somehow clicked via browser dev tools...)                            │
│                                                                             │
│  Backend: assignCredit()                                                  │
│    ↓                                                                       │
│  ✅ CONVERT: foodbiz-profile → foodbiz-auth-user-id (abc789)            │
│    ↓                                                                       │
│  ✅ VERIFY: Query for existing premium                                   │
│    ├─ Filter: user_id = 'foodbiz-profile'                               │
│    ├─ Filter: status = 'active'                                          │
│    ├─ Filter: plan_tier = 'premium'                                      │
│    ├─ Filter: current_period_end > NOW()                                │
│    └─ Result: 1 row (HAS PREMIUM) → BLOCK ❌                            │
│    ↓                                                                       │
│  ❌ RETURN ERROR:                                                        │
│    {                                                                       │
│      success: false,                                                      │
│      error: "Startup already has active premium subscription.             │
│              No credit deducted."                                         │
│    }                                                                       │
│    ↓                                                                       │
│  ❌ NO CHANGES TO ANY TABLE                                              │
│                                                                             │
│  Database Result:                                                         │
│  ┌─ advisor_credits ─────────────────────────────────┐                  │
│  │ abc123   │ credits_available=4 │ credits_used=1   │  ← UNCHANGED    │
│  └───────────────────────────────────────────────────┘                  │
│  ┌─ user_subscriptions (foodbiz) ──────────────────────────────┐        │
│  │ foodbiz-profile │ premium │ active │ NULL │ ... │ (future) │        │
│  └────────────────────────────────────────────────────────────┘         │
│                 ↑ Still shows NULL (self-paid), unchanged                │
│                                                                             │
│  STATUS: ✅ Protected - no double charging, no credit wasted             │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: STARTUP LOGS IN & SEES PREMIUM ACCESS                             │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Startup: TechCo [auth_user_id = xyz789, profile_id = tech-co-profile]   │
│                                                                             │
│  On login:                                                                 │
│  1. Frontend queries: user_subscriptions for tech-co-profile              │
│  2. Finds active premium subscription                                      │
│  3. Checks if `paid_by_advisor_id = 'abc123'` (not null)                │
│  4. Sets `isSelfPaid = false` (advisor-paid)                             │
│  5. Unlocks premium features:                                              │
│     ✅ Portfolio/Fundraising CRM                                          │
│     ✅ Investor AI Matching                                               │
│     ✅ Investor Add to CRM                                                │
│     ✅ Active Fundraising Status                                          │
│     ✅ And more...                                                         │
│                                                                             │
│  Dashboard Shows:                                                          │
│  ┌─ Premium Badge ────────────────────────────────────────┐              │
│  │ Premium Active                                         │              │
│  │ Expires: [Date + 1 month]                              │              │
│  │ Paid by: Investment Advisor John                       │              │
│  └────────────────────────────────────────────────────────┘              │
│                                                                             │
│  STATUS: ✅ Startup has premium access                                    │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 ID FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        IDENTITY MAPPING                                 │
└─────────────────────────────────────────────────────────────────────────┘

Frontend Browser:
  User logs in → Supabase Auth (auth.users table)
         ↓
    auth_user_id = "abc123" ← From auth.uid()
         ↓
  User Profile created (user_profiles table)
         ↓
    profile_id = "profile-def456"
    auth_user_id = "abc123" (FK)
         ↓
  Frontend stores both IDs in session
    - currentUser.id (usually profile_id)
    - authUserId (from auth.uid())
         ↓
  Calls assignCredit(advisorUserId, startupUserId)
    - advisorUserId = authUserId (profile_id converted)
    - startupUserId = startup.user_id (profile_id)
         ↓
         ↓
Backend:
  assignCredit(advisorUserId='profile-abc', startupUserId='profile-def')
         ↓
    STEP 1: Convert startupUserId to auth_user_id
    Query: user_profiles WHERE id = 'profile-def'
    Result: auth_user_id = 'xyz789'
         ↓
    STEP 2: Query premium (uses profile_id)
    Query: user_subscriptions WHERE user_id = 'profile-def'
         ↓
    STEP 3: Create assignment (uses auth_user_id)
    INSERT: advisor_credit_assignments
      startup_user_id = 'xyz789' ← Converted!
         ↓
    STEP 4: Create subscription (uses profile_id)
    INSERT: user_subscriptions
      user_id = 'profile-def' ← Original!
         ↓
         ↓
Database:
  advisor_credit_assignments:
    startup_user_id = 'xyz789' (auth_user_id) ✅
         ↓
  user_subscriptions:
    user_id = 'profile-def' (profile_id) ✅
    paid_by_advisor_id = 'profile-abc' (advisor auth_user_id) ✅
         ↓
  Links established:
    startup auth_user_id 'xyz789' ← → profile_id 'profile-def'
    assignment has correct auth_user_id ✅
    subscription has correct profile_id ✅
```

---

## 📊 TABLE RELATIONSHIPS

```
┌─────────────────────────────┐
│      auth.users             │
├─────────────────────────────┤
│ id (auth_user_id)           │
│ email                       │
└────────┬────────────────────┘
         │ 1
         │
         │ Many
         ↓
┌─────────────────────────────┐
│   user_profiles             │
├─────────────────────────────┤
│ id (profile_id)      ← KEY  │
│ auth_user_id (FK) ───┘      │
│ name                        │
└────┬────────┬────────┬──────┘
     │        │        │
     │        │        │
  [1]│        │[1]     │[1]
     │        │        │
     │        │        └──────────────┐
     │        │                       │
   [M]│      [M]│                   [M]│
     │        │                       │
     ↓        ↓                       ↓
┌──────────────────┐  ┌──────────────────┐
│ advisor_credit_  │  │ user_            │  ┌─────────────────┐
│ assignments      │  │ subscriptions     │  │ advisor_credits │
├──────────────────┤  ├──────────────────┤  ├─────────────────┤
│ startup_user_id  │  │ user_id          │  │ advisor_user_id │
│ (FK→auth_user_id)│  │ (FK→profile_id)  │  │ (FK→profile_id) │
│ advisor_user_id  │  │ paid_by_advisor_ │  │ credits_available
│ status           │  │ id (FK→          │  │ credits_used    │
└──────────────────┘  │ profile_id)      │  └─────────────────┘
                      └──────────────────┘
```

---

## ✅ VERIFICATION POINTS

1. **ID Conversion** ✅
   - Startup profile_id → auth_user_id before assignment creation
   - Log: "🔄 Converted startup profile_id to auth_user_id"

2. **Premium Check** ✅
   - Query uses profile_id for user_subscriptions
   - All 4 conditions checked (user_id, status, plan_tier, not expired)
   - Log: "⚠️ Startup already has active premium..." if found

3. **Credit Deduction** ✅
   - Only if premium check passes
   - Updates advisor_credits.credits_available

4. **Assignment Creation** ✅
   - Uses converted auth_user_id for startup_user_id
   - Status set to 'active'
   - Auto-renewal enabled by default

5. **Subscription Creation** ✅
   - Uses original profile_id for user_id
   - Uses advisor's auth_user_id for paid_by_advisor_id
   - Period set to current_date + 1 month

---

## 🎯 SUCCESS INDICATORS

After implementation:

✅ **Assignment record created with correct auth_user_id**
✅ **Subscription record created with correct profile_id**
✅ **Credit deducted only when no existing premium**
✅ **Self-paid premium prevents advisor credit assignment**
✅ **Startup sees premium features unlocked**
✅ **No database errors about ID mismatches**

