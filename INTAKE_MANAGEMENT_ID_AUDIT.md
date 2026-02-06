## 📋 INTAKE MANAGEMENT - FACILITATOR ID AUDIT

### WHERE DATA IS LOADED:

**Lines 1573-1595:**
```typescript
// Set facilitator ID from profile
setFacilitatorId(profile.id);  ← Profile ID: d3fa5dca... ✅

// BUT:
// NOTE: incubation_opportunities uses auth.uid() (user.id), NOT user_profiles.id
// NOTE: facilitator_startups also uses auth.uid() (user.id), NOT user_profiles.id

// Load opportunities (uses auth.uid())
supabase
  .from('incubation_opportunities')
  .select('*')
  .eq('facilitator_id', user.id)  ← AUTH USER ID! ⚠️
  .order('created_at', { ascending: false })
```

---

## 🔴 CRITICAL FINDING:

### **Intake Management Uses AUTH USER ID, Not Profile ID!**

```
facilitatorId state variable:      d3fa5dca... (Profile ID) ✅
incubation_opportunities table:    Stored with user.id (Auth ID) ⚠️

Line 1583:
.eq('facilitator_id', user.id)  ← Uses Auth User ID
NOT
.eq('facilitator_id', facilitatorId)  ← Not using the profile ID!
```

---

## 📊 COMPARISON TABLE:

| Feature | Using | ID Type | Status |
|---------|-------|---------|--------|
| **Intake Management (Opportunities)** | `user.id` | Auth User ID | ⚠️ DIFFERENT |
| **Intake Management (Portfolio)** | `user.id` | Auth User ID | ⚠️ DIFFERENT |
| **Configure Questions** | `facilitatorId` | Profile ID | ✅ CORRECT |
| **Create Mandate (Option B)** | `facilitatorId` | Profile ID | ✅ CORRECT |
| **Load Report Mandates** | `facilitatorId` | Profile ID | ✅ CORRECT |

---

## 🎯 WHAT THIS MEANS:

### **Intake Management Data Sources:**

1. **incubation_opportunities**
   ```sql
   WHERE facilitator_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd'  ← Auth User ID
   ```

2. **facilitator_startups**
   ```sql
   WHERE facilitator_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd'  ← Auth User ID
   ```

3. **opportunity_applications**
   ```sql
   WHERE opportunity_id IN (...)  ← Linked via opportunities
   ```

---

## ✅ GOOD NEWS:

**Intake Management is CORRECTLY using Auth User ID!** ✅

Because:
- `incubation_opportunities` table stores `facilitator_id = user.id` (Auth ID)
- System queries with `user.id` (Auth ID)
- **THEY MATCH!** ✓

---

## ⚠️ THE REAL ISSUE:

We have **TWO DIFFERENT ID SYSTEMS** in the codebase:

| Module | Using | Why |
|--------|-------|-----|
| **Intake Management** | Auth User ID (`user.id`) | incubation_opportunities stores auth.uid() |
| **Track My Startup Reports** | Profile ID (`profile.id`) | New system uses user_profiles.id |
| **Configure Questions** | Profile ID (`profile.id`) | Uses incubation_program_questions |

---

## 💡 RECOMMENDATION:

**DO NOT change Intake Management!** ✅

It's working correctly with Auth User ID because:
1. ✅ incubation_opportunities uses auth.uid()
2. ✅ facilitator_startups uses auth.uid()
3. ✅ Code queries with user.id (Auth ID)
4. ✅ They match perfectly!

**ONLY fix Track My Startup / Configure Questions:**
- Database: Migrate old Auth ID → Profile ID in `incubation_program_questions`
- This fixes Configure Questions modal
- Option B continues to work with Profile ID

---

## ACTION ITEMS:

1. ✅ Keep Intake Management as-is (uses Auth User ID correctly)
2. ✅ Run migration for `incubation_program_questions` (Profile ID fix)
3. ✅ No frontend changes needed!

```sql
-- ONLY need to migrate incubation_program_questions:
UPDATE incubation_program_questions
SET facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1'  ← Profile ID
WHERE facilitator_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd';  ← Auth ID
```

This will fix Configure Questions while keeping Intake Management working perfectly! ✅
