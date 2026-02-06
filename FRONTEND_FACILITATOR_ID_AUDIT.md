## 📋 FRONTEND FACILITATOR ID AUDIT

### WHERE facilitatorId IS SET:

**Line 1573: FacilitatorView.tsx**
```typescript
const profile = await userProfileService.getUserProfile(user.id);
setFacilitatorId(profile.id);  ← Sets to Profile ID ✅
```

**What is profile.id?**
- From `user_profiles` table
- Matches: d3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1 ✅ (CORRECT - Profile ID)

---

### WHERE facilitatorId IS USED:

#### 1. **Configure Questions Modal** (Lines 420-429)
```typescript
const existingQuestions = await questionBankService.getProgramTrackingQuestions(
  facilitatorId,  ← Uses Profile ID ✅
  programName
);
```
**Database Query:**
```sql
SELECT * FROM incubation_program_questions
WHERE facilitator_id = 'd3fa5dca...' (Profile ID) ✅
AND program_name = 'Tech Incubation'
```

---

#### 2. **Save Program Questions** (Lines 459-507)
```typescript
const existingQuestions = await questionBankService.getProgramTrackingQuestions(
  facilitatorId,  ← Uses Profile ID ✅
  selectedProgramForQuestions
);
// Then:
await questionBankService.addQuestionsToProgram(
  facilitatorId,  ← Uses Profile ID ✅
  selectedProgramForQuestions,
  ...
);
```

---

#### 3. **Create Mandate (Option B)** (Lines 598-656)
```typescript
const { error } = await supabase
  .from('reports_mandate')
  .insert({
    id: mandateId,
    facilitator_id: facilitatorId,  ← Uses Profile ID ✅
    title: reportTitle,
    program_name: reportProgram,
    question_ids: reportQuestionIds,
    target_startups: targetStartupIds,
    source: reportSource,
    status: 'draft',
    created_at: new Date().toISOString()
  });

// Then adds questions to program:
await questionBankService.addQuestionsToProgram(
  facilitatorId,  ← Uses Profile ID ✅
  reportProgram,
  reportQuestionIds,
  ...
);
```

---

#### 4. **Load Report Mandates** (Lines 821-829)
```typescript
const { data, error } = await supabase
  .from('reports_mandate')
  .select('*')
  .eq('facilitator_id', facilitatorId)  ← Uses Profile ID ✅
  .order('created_at', { ascending: false });
```

---

#### 5. **Generate Existing Report (Option A)** (Line 667)
```typescript
const existingQuestions = await questionBankService.getProgramTrackingQuestions(
  facilitatorId,  ← Uses Profile ID ✅
  programName
);
```

---

### SUMMARY:

| Location | Using | Status |
|----------|-------|--------|
| Configure Questions Load | Profile ID ✅ | CORRECT |
| Configure Questions Save | Profile ID ✅ | CORRECT |
| Create Mandate (Option B) | Profile ID ✅ | CORRECT |
| Load Report Mandates | Profile ID ✅ | CORRECT |
| Generate Report (Option A) | Profile ID ✅ | CORRECT |

---

### THE PROBLEM:

**Frontend:** ✅ ALL CORRECT - Using Profile ID everywhere

**Database:** ❌ HAS MIXED DATA
- Old questions: Stored with Auth ID (ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd)
- New questions: Stored with Profile ID (d3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1)

**Result:**
```
Frontend queries: facilitator_id = 'd3fa5dca...' (Profile ID)
Database has:     facilitator_id = 'ad3ec5ce...' (Auth ID)
                  ↑ NO MATCH = Empty result
```

---

### CONCLUSION:

**Frontend code is CORRECT!** ✅

The issue is **purely DATABASE DATA** - old questions have the wrong facilitator_id.

**Action Needed:** Run migration script to update database
```sql
UPDATE incubation_program_questions
SET facilitator_id = 'd3fa5dca-ebf9-4570-b2c8-d5aa76a1c6b1'
WHERE facilitator_id = 'ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd';
```

**NO frontend changes needed!** ✅
