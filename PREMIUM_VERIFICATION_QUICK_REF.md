# QUICK REFERENCE: STARTUP PREMIUM VERIFICATION

## ⚡ One-Liner
**When advisor tries to assign credit: Check if startup has active premium → If YES, block & don't deduct credit**

---

## 📍 Code Location
**File:** [lib/advisorCreditService.ts](lib/advisorCreditService.ts#L370-L390)  
**Function:** `assignCredit()`  
**Lines:** 370-390

---

## 🔍 THE QUERY

```typescript
// Check: Does startup already have active premium?
const { data: existingPremiumSubs } = await supabase
  .from('user_subscriptions')
  .select('id, status, current_period_end, plan_tier')
  .eq('user_id', startupUserId)              // ✅ profile_id
  .eq('status', 'active')                    // ✅ must be active
  .eq('plan_tier', 'premium')                // ✅ must be premium  
  .gte('current_period_end', nowISO);        // ✅ not expired

const hasActivePremium = existingPremiumSubs?.length > 0;

if (hasActivePremium) {
  return {
    success: false,
    error: 'Startup already has active premium subscription. No credit deducted.'
  };
}
```

---

## ✅ What Gets Checked

| Field | Value | Meaning |
|-------|-------|---------|
| `user_id` | startup_profile_id | This startup |
| `status` | 'active' | Premium is current |
| `plan_tier` | 'premium' | Is premium (not basic/free) |
| `current_period_end` | > NOW() | Not expired |

---

## 🛑 If Premium Found

- ❌ **Credit NOT deducted**
- ❌ **Assignment NOT created**
- ❌ **Subscription NOT updated**
- ✅ **Error message returned**: "Startup already has active premium"

---

## ✅ If No Premium Found

- ✅ **Check advisor has credits**
- ✅ **Deduct 1 credit**
- ✅ **Create assignment**
- ✅ **Create subscription**
- ✅ **Return success**

---

## 🎯 Covers Both Cases

```
Self-Paid Premium:
  paid_by_advisor_id = NULL
  → Query still finds it → BLOCKS ✅

Advisor-Paid Premium:
  paid_by_advisor_id = 'advisor-id'
  → Query still finds it → BLOCKS ✅
```

**Why?** Query doesn't check `paid_by_advisor_id` value - only checks tier & status!

---

## 📋 Example Scenarios

### Scenario A: Startup Bought Premium
```
Startup: TechCo (has active premium, self-paid)
Advisor: John (tries to assign credit)

Query finds: 1 row
Result: hasActivePremium = true
Action: BLOCK - return error
Credit deducted: ❌ NO
```

### Scenario B: Premium Expired
```
Startup: TechCo (had premium, expired Jan 10)
Advisor: John (tries to assign credit on Jan 17)

Query: current_period_end (Jan 10) > NOW() (Jan 17) = FALSE
Query finds: 0 rows (expired filtered out)
Result: hasActivePremium = false
Action: PROCEED - deduct credit
Credit deducted: ✅ YES
```

### Scenario C: First Assignment
```
Startup: TechCo (no premium yet)
Advisor: John (assigns credit)

Query finds: 0 rows
Result: hasActivePremium = false
Action: PROCEED - deduct credit
Credit deducted: ✅ YES
```

---

## 🔐 Protection Layers

1. **Frontend:** Toggle disabled if premium exists
2. **Backend:** Query blocks if premium exists
3. **Database:** RLS policies control access

---

## 🧪 Test It

```sql
-- Find startup with premium
SELECT * FROM user_subscriptions
WHERE user_id = 'startup-profile-id'
  AND status = 'active'
  AND plan_tier = 'premium'
  AND current_period_end > NOW();

-- If result has 1+ rows:
-- ✅ Premium is active
-- ✅ Will be blocked from credit assignment
-- ✅ No credit will be deducted

-- If result has 0 rows:
-- ✅ No active premium
-- ✅ Credit assignment will proceed
-- ✅ Credit will be deducted
```

---

## 📞 Troubleshooting

**Q: Premium exists but credit still deducted?**  
A: Check `current_period_end` - must be > NOW() to block

**Q: Query found premium but assignment still created?**  
A: Check RLS policies - startup might have direct write access

**Q: Can't see why credit deducted when premium active?**  
A: Look at logs for "Startup already has active premium" message

---

## 🚀 Deployment Checklist

- [ ] Code has the query (lines 370-375)
- [ ] Condition checks `hasActivePremium` (line 380)
- [ ] Early return blocks execution (lines 381-386)
- [ ] Error message is clear
- [ ] No code deducts credit after this point
- [ ] Frontend also checks & hides toggle

