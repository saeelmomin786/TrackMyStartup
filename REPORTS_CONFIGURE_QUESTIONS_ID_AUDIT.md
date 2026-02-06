## 🔴 REPORTS / CONFIGURE QUESTIONS - FACILITATOR ID AUDIT

### WHERE THE ID COMES FROM:

**Line 1573 (FacilitatorView.tsx):**
```typescript
// Use profile ID for facilitator operations (matches database records)
setFacilitatorId(profile.id);  ← PROFILE ID: d3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1 ✅
```

---

## HOW IT'S USED:

**Line 430 (FacilitatorView.tsx - openProgramQuestionsConfig):**
```typescript
const existingQuestions = await questionBankService.getProgramTrackingQuestions(
  facilitatorId,  ← PROFILE ID passed here
  programName
);
```

**Line 688 (questionBankService.ts - getProgramTrackingQuestions):**
```typescript
const { data, error } = await supabase
  .from('incubation_program_questions')
  .select(`...`)
  .eq('facilitator_id', facilitatorId)  ← Query with PROFILE ID
  .eq('program_name', programName)
```

---

## 🔴 THE PROBLEM:

### **ID MISMATCH!**

| Component | Using | Value | Issue |
|-----------|-------|-------|-------|
| Code sets facilitatorId | Profile ID | `d3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1` | ✅ Correct |
| Code queries with facilitatorId | Profile ID | `d3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1` | ✅ Correct |
| Database table has OLD data | Auth User ID | `ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd` | ❌ WRONG! |

### **Result:**
```
Query: WHERE facilitator_id = 'd3fa5dca...' (Profile ID)
Data:  facilitator_id = 'ad3ec5ce...' (Auth ID)
                    ↓
              NO MATCH! ❌
                    ↓
            Returns 0 rows
                    ↓
       "Configure Questions" modal shows EMPTY!
```

---

## ✅ YES - REPORTS USES PROFILE ID (CORRECT)

**But the DATABASE HAS AUTH ID data (WRONG)**

The code is correct, the data is wrong!

---

## 🎯 SOLUTION:

**Migrate incubation_program_questions table:**

```sql
-- Update all old Auth ID records to new Profile ID
UPDATE incubation_program_questions
SET facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1'
WHERE facilitator_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd';

-- Verify
SELECT COUNT(*) FROM incubation_program_questions 
WHERE facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1';
-- Should return 6+ records
```

---

## 📝 SYSTEM MAP:

| Component | Code Uses | Data Stored | Match? | Status |
|-----------|-----------|-------------|--------|--------|
| **Intake Management** | `user.id` (Auth ID) | Auth ID | ✅ YES | ✅ WORKS |
| **Startup Dashboard** | `auth_user_id` (Auth ID) | Auth ID | ✅ YES | ✅ WORKS |
| **Reports / Configure** | `profile.id` (Profile ID) | Auth ID | ❌ NO | ⚠️ BROKEN |

---

## ✅ ANSWER:

**YES - Reports uses Profile ID (the correct new system)**

**BUT the database still has old Auth ID data**

**That's why Configure Questions shows empty!**

**Only need to run the migration script to fix.** 🚀
