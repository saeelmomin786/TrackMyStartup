## 📊 STARTUP DASHBOARD - FACILITATOR ID AUDIT

### WHERE DATA IS LOADED:

**Lines 646-680 (StartupDashboardTab.tsx):**
```typescript
// Load opportunities
const { data: opportunities, error: oppError } = await supabase
  .from('incubation_opportunities')
  .select(`id, program_name, facilitator_id, facilitator_code`)
  .in('id', opportunityIds);

// Extract facilitator IDs from opportunities
const facilitatorIds = opportunities
  .map(opp => opp.facilitator_id)  ← FROM incubation_opportunities ✅
  .filter(Boolean);

// Fetch profiles using auth_user_id
const { data: profiles, error: profileError } = await supabase
  .from('user_profiles')
  .select('id, auth_user_id, center_name, facilitator_code, firm_name, email')
  .in('auth_user_id', facilitatorIds);  ← MATCH with auth_user_id ✅
```

### 🟢 CRITICAL COMMENT (Line 674):
```typescript
// NOTE: facilitator_id in incubation_opportunities stores auth_user_id, 
//       NOT user_profiles.id
```

---

## ✅ HOW IT WORKS:

1. **Get opportunities** from `incubation_opportunities` table
   - Each opportunity has `facilitator_id` field
   - This field stores **Auth User ID** (ad3ec5ce...)

2. **Extract facilitator IDs** from opportunities
   - Gets array of auth_user_ids

3. **Look up in user_profiles**
   - Query: `WHERE auth_user_id IN (facilitator_ids)`
   - Matches by `auth_user_id` column ✅
   - Gets: center_name, firm_name, email

4. **Enrich application data**
   - Adds facilitator info to each application
   - Shows center_name in dashboard

---

## 🎯 ID SYSTEM USED:

| Step | Using | ID Value | Status |
|------|-------|----------|--------|
| Load opportunities | `facilitator_id` in incubation_opportunities | Auth User ID (ad3ec5ce...) | ✅ CORRECT |
| Extract IDs | `opp.facilitator_id` | Auth User ID | ✅ CORRECT |
| Lookup profiles | `WHERE auth_user_id IN (...)` | Auth User ID | ✅ CORRECT |
| Get profile info | `facilitatorProfiles[auth_user_id]` | Auth User ID key | ✅ CORRECT |

---

## ✅ VERIFICATION:

**The Startup Dashboard is 100% CORRECT!** ✅

**Why it works:**
1. ✅ incubation_opportunities.facilitator_id = Auth User ID
2. ✅ Query user_profiles.auth_user_id = Auth User ID
3. ✅ They match perfectly!
4. ✅ Code has explicit comment explaining the relationship

---

## 📝 SUMMARY:

### **Three Different Systems in Codebase:**

| Module | Table | Using | ID Type | Status |
|--------|-------|-------|---------|--------|
| **Intake Management** | incubation_opportunities | `user.id` query | Auth User ID | ✅ WORKS |
| **Startup Dashboard** | incubation_opportunities | `auth_user_id` lookup | Auth User ID | ✅ WORKS |
| **Track My Startup Reports** | incubation_program_questions | `profile.id` query | Profile ID | ⚠️ NEEDS MIGRATION |

---

## 🎯 BOTTOM LINE:

**Two systems working perfectly with Auth User ID:**
- ✅ Intake Management
- ✅ Startup Dashboard

**One system needs migration to Profile ID:**
- ⚠️ Track My Startup Reports / Configure Questions

**Only action needed:**
```sql
-- Fix only this table:
UPDATE incubation_program_questions
SET facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1'  ← Profile ID
WHERE facilitator_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd';  ← Auth ID
```

Everything else is working correctly! ✅
