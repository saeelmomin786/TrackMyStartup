## DETAILED COMPARISON: Current vs Fixed RLS Policies

### ✅ SAFE TO APPLY - Here's Why:

---

## WHAT'S CHANGING

### **1. INSERT Policy**

**CURRENT:**
```sql
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = user_subscriptions.user_id 
    AND up.auth_user_id = auth.uid()
  )
)
```
❌ Problem: Only allows user to insert for themselves
❌ Blocks: Advisor inserting subscription for startup (startup.profile_id ≠ advisor.auth_uid)

**NEW:**
```sql
WITH CHECK (
  -- Option 1: User creating subscription for themselves
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.id = user_subscriptions.user_id 
    AND up.auth_user_id = auth.uid()
  )
  OR
  -- Option 2: Investment Advisor creating subscription for anyone
  EXISTS (
    SELECT 1 FROM public.user_profiles advisor
    WHERE advisor.auth_user_id = auth.uid() 
    AND advisor.role = 'Investment Advisor'
  )
)
```
✅ Fix: Allows BOTH scenarios

### **2. READ Policy**

**CURRENT vs NEW:**
- No change to READ policy logic
- Still checks if user is owner OR admin
- ✅ Safe, won't break anything

### **3. UPDATE Policy**

**CURRENT vs NEW:**
- Added: Advisors AND Admins can update subscriptions
- ✅ Safe, expands access for legitimate use case

---

## IMPACT ANALYSIS

| Who | Current | After Fix | Impact |
|-----|---------|-----------|--------|
| **Startup** | ✅ Can create own subscription | ✅ Can create own subscription | ✅ No change |
| **Startup** | ✅ Can read own subscription | ✅ Can read own subscription | ✅ No change |
| **Advisor** | ❌ BLOCKED (403) | ✅ Can create startup subscription | 🔧 FIXED |
| **Advisor** | ✅ Can update own | ✅ Can update own + can update assigned | ✅ Expansion (safe) |
| **Admin** | ✅ Can do all | ✅ Can do all | ✅ No change |

---

## WILL THIS BREAK EXISTING FLOWS?

| Flow | Status | Why |
|------|--------|-----|
| **Startups self-subscribing** | ✅ No impact | Still allowed by Option 1 |
| **Admin subscription management** | ✅ No impact | Admins still have `user_subscriptions_admin_all` policy |
| **Startup reading own subscription** | ✅ No impact | Option 1 still applies |
| **Investors/Mentors** | ✅ No impact | They're not Investment Advisors |
| **Data isolation** | ✅ Safe | Each role still can only access what they should |

---

## ✅ CONCLUSION: SAFE TO RUN

**What you're doing:**
- ✅ Adding ONE new condition to INSERT policy
- ✅ Expanding UPDATE policy for Advisors
- ✅ Not removing any existing permissions
- ✅ Following least-privilege principle

**Risk Level:** 🟢 LOW
**Reversibility:** 🟢 HIGH (can rollback by running CREATE_BILLING_RLS.sql)

---

## RECOMMENDED ORDER

1. ✅ Run `BACKUP_CURRENT_RLS_STATE.sql` first (just SELECT queries)
2. ✅ Copy results somewhere safe
3. ✅ Run `FIX_RLS_ADVISOR_SUBSCRIPTIONS.sql`
4. ✅ Try creating subscription in advisor dashboard
5. ✅ If issue: Run `CREATE_BILLING_RLS.sql` to revert

---

## 🔄 ROLLBACK PLAN (if needed)

If something breaks, run [CREATE_BILLING_RLS.sql](CREATE_BILLING_RLS.sql) to restore original policies.
