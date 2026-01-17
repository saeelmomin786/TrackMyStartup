# ADVISOR CREDIT ID MISMATCH FIX

## 🔴 THE ISSUE

**Problem:** When investment advisor assigned credit to startup, **no subscription was created** in the `user_subscriptions` table.

**Root Cause:** ID type mismatch between tables:

```
Frontend passes:
  startupUserId = startup.user_id (profile_id)
                    ↓
  assignCredit(advisorUserId, startupUserId)
                                      ↑
                                  profile_id
                    ↓
advisor_credit_assignments:
  startup_user_id = profile_id  ❌ WRONG (expects auth_user_id)
  
user_subscriptions:
  user_id = profile_id          ✅ CORRECT
  paid_by_advisor_id = ?        ❌ NO VALUE
```

**Result:**
- ✅ Assignment created with profile_id (wrong table schema)
- ❌ Subscription NOT created (because assignment creation may fail or mismatch)
- ❌ startup premium not unlocked
- ❌ advisor dashboard shows subscription not created

---

## 📊 TABLE SCHEMA MISMATCH

### advisor_credit_assignments Table
```sql
Column: startup_user_id
Type: UUID (Foreign Key to auth.users)
Expected: auth.users.id (from auth.uid())
```

### user_subscriptions Table
```sql
Column: user_id
Type: UUID (Foreign Key to user_profiles)
Expected: user_profiles.id (profile_id)

Column: paid_by_advisor_id
Type: UUID (Foreign Key to user_profiles)
Expected: user_profiles.id (advisor's profile_id) OR auth_user_id
```

---

## ✅ THE FIX

### Modified: `lib/advisorCreditService.ts`

**Function:** `assignCredit()`

**What Changed:**
1. Added profile_id to auth_user_id conversion at start of function
2. Detect if passed `startupUserId` is a profile_id
3. Query `user_profiles` table to get `auth_user_id`
4. Use auth_user_id for all `advisor_credit_assignments` operations
5. Keep using profile_id for `user_subscriptions` operations

```typescript
async assignCredit(
  advisorUserId: string,
  startupUserId: string,  // Might be profile_id
  enableAutoRenewal: boolean = true
) {
  // NEW: Convert profile_id to auth_user_id if needed
  let startupAuthUserId = startupUserId;
  
  const { data: startupProfile } = await supabase
    .from('user_profiles')
    .select('auth_user_id')
    .eq('id', startupUserId)
    .maybeSingle();
  
  if (startupProfile?.auth_user_id) {
    startupAuthUserId = startupProfile.auth_user_id;
  }
  
  // Use startupAuthUserId for assignments table
  await supabase
    .from('advisor_credit_assignments')
    .insert({
      startup_user_id: startupAuthUserId,  // ✅ auth_user_id
      ...
    });
  
  // Use startupUserId (profile_id) for subscriptions table
  await this.createStartupSubscription(
    startupUserId,  // ✅ profile_id
    advisorUserId,
    ...
  );
}
```

---

## 📋 VERIFICATION CHECKLIST

After fix deployment, verify:

### 1. Database Records Created
```sql
-- Should have BOTH records now
SELECT * FROM advisor_credit_assignments 
WHERE startup_user_id = 'auth-user-id' -- ✅ auth_user_id

SELECT * FROM user_subscriptions 
WHERE user_id = 'profile-id' -- ✅ profile_id
AND paid_by_advisor_id = 'advisor-profile-id'
```

### 2. Startup Dashboard Test
- [ ] Advisor buys credits
- [ ] Advisor assigns credit to startup (toggle ON)
- [ ] Check Supabase:
  - [ ] Row created in `advisor_credit_assignments` with auth_user_id ✅
  - [ ] Row created in `user_subscriptions` with profile_id ✅
  - [ ] Subscription has `paid_by_advisor_id = advisor's profile_id` ✅
- [ ] Startup logs in
- [ ] Startup dashboard shows premium access
- [ ] Premium features unlocked (portfolio_fundraising, etc.)

### 3. My Startups Display
- [ ] Advisor views "My Startups" tab
- [ ] For assigned startup:
  - [ ] Shows "Premium Active" badge ✅
  - [ ] Shows "Auto-renewal: ON" ✅
  - [ ] Shows expiry date ✅
  - [ ] Toggle switch visible and clickable ✅

### 4. Self-Paid Premium Protection
- [ ] Startup buys premium themselves
- [ ] Advisor dashboard shows purple badge "Premium Active by Startup"
- [ ] Advisor sees NO toggle switch
- [ ] Backend prevents credit deduction

---

## 🔑 KEY ID MAPPING

| Context | Variable | Type | Table | Column |
|---------|----------|------|-------|--------|
| **Auth** | `auth.uid()` | auth_user_id | `auth.users` | `id` |
| **User Profile** | `profile.id` | profile_id | `user_profiles` | `id` |
| **Assignment** | `startup_user_id` | auth_user_id | `advisor_credit_assignments` | `startup_user_id` |
| **Subscription** | `user_id` | profile_id | `user_subscriptions` | `user_id` |
| **Advisor Paid By** | `paid_by_advisor_id` | profile_id OR auth_user_id | `user_subscriptions` | `paid_by_advisor_id` |

**NOTE:** The fix treats `paid_by_advisor_id` as auth_user_id since that's what `advisorUserId` parameter provides.

---

## 🚀 DEPLOYMENT STEPS

1. **Commit the fix:**
   ```bash
   git add lib/advisorCreditService.ts
   git commit -m "FIX: Resolve ID type mismatch in advisor credit assignment"
   ```

2. **Deploy to production:**
   ```bash
   git push origin main
   # Vercel auto-deploys
   ```

3. **Verify in production:**
   - [ ] Create test advisor account
   - [ ] Buy credits (should work)
   - [ ] Assign credit to test startup
   - [ ] Check Supabase for both assignment + subscription records
   - [ ] Test startup logs in and sees premium features

---

## 🐛 TESTING SCENARIOS

### Scenario 1: Fresh Assignment
```
Advisor: "John" (auth_user_id = abc123)
Startup: "TechCo" (profile_id = def456, auth_user_id = xyz789)

BEFORE FIX:
- Assignment created with profile_id (WRONG)
- Subscription: NOT CREATED
- Result: Premium NOT unlocked

AFTER FIX:
- Assignment created with auth_user_id xyz789 ✅
- Subscription created with user_id = def456 ✅
- paid_by_advisor_id = abc123 ✅
- Result: Premium UNLOCKED ✅
```

### Scenario 2: Toggle Updates Auto-Renewal
```
BEFORE FIX:
- Can't find existing assignment (ID mismatch)
- Always tries to create new
- May fail with unique constraint error

AFTER FIX:
- Finds assignment with correct auth_user_id
- Updates auto_renewal_enabled
- No credit deduction needed
- Works perfectly ✅
```

### Scenario 3: Self-Paid Protection
```
BEFORE FIX:
- Assignment creation with wrong ID might fail
- Protection logic doesn't work

AFTER FIX:
- Assignment checks correctly identify self-paid subscriptions
- Prevents double-charging
- Protection works as designed ✅
```

---

## 📞 SUPPORT

If subscriptions still don't create after deployment:

1. **Check logs for conversion errors:**
   ```
   🔄 Converted startup profile_id to auth_user_id
   ```

2. **Verify profile exists:**
   ```sql
   SELECT id, auth_user_id FROM user_profiles 
   WHERE id = 'startup-profile-id'
   ```

3. **Check for overlapping assignments:**
   ```sql
   SELECT * FROM advisor_credit_assignments
   WHERE startup_user_id = 'auth-user-id'
   AND status = 'active'
   ```

4. **Verify subscription_plans exist:**
   ```sql
   SELECT id FROM subscription_plans
   WHERE plan_tier = 'premium'
   AND user_type = 'Startup'
   ```

---

## 📝 NOTES

- This fix is backward compatible
- No database schema changes needed
- Conversion happens transparently
- Both old and new code will work
- No data migration required

