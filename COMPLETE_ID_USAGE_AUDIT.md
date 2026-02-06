# 🔍 FACILITATOR VIEW - COMPLETE ID USAGE AUDIT

## 📋 MAIN STATE VARIABLE
**Line 1573:** `setFacilitatorId(user.id)` ← **AUTH USER ID** (ad3ec5ce...)

---

## 🏢 INTAKE MANAGEMENT TAB

### 1. Load Opportunities
**Line 1588-1591:**
```typescript
supabase
  .from('incubation_opportunities')
  .select('*')
  .eq('facilitator_id', user.id)  ← AUTH USER ID ✅
```
**Using:** Auth User ID (user.id)
**Table:** incubation_opportunities
**Status:** ✅ Correct

---

### 2. Load Portfolio Startups
**Line 1286-1289:**
```typescript
const loadPortfolio = async (facilitatorId: string) => {
  const portfolio = await facilitatorStartupService.getFacilitatorPortfolio(facilitatorId);
```
**Called with:** `loadPortfolio(user.id)` (Line 1598) ← AUTH USER ID
**Using:** Auth User ID
**Table:** facilitator_startups (via service)
**Status:** ✅ Correct

---

### 3. Load Received Applications
**Lines 1616-1643:**
```typescript
const { data: allApplications } = await supabase
  .from('opportunity_applications')
  .select('*')
  .in('opportunity_id', myPostedOpportunities.map(opp => opp.id))
```
**Using:** Filtered by opportunity IDs (which are owned by Auth User ID)
**Table:** opportunity_applications
**Status:** ✅ Correct (indirect - through opportunities)

---

## 📊 TRACK MY STARTUPS TAB

### 1. Load Recognition Records (Portfolio Sub-Tab)
**Line 1300-1308:**
```typescript
const loadRecognitionRecords = async (facilitatorId: string) => {
  const { data: facilitatorData } = await supabase
    .from('user_profiles')
    .select('facilitator_code')
    .eq('id', facilitatorId)  ← PROFILE ID ⚠️
    .single();
```
**Called with:** `loadRecognitionRecords(profile.id)` (Line 1594) ← **PROFILE ID**
**Using:** Profile ID (d3fa5dca...)
**Query:** Gets facilitator_code from user_profiles
**Then queries:** recognition_records by facilitator_code
**Status:** ✅ Correct (uses profile.id, queries by facilitator_code)

---

### 2. Load Question Bank (Reports Sub-Tab)
**Line 800-813:**
```typescript
const questionBank = await questionBankService.loadQuestionBank();
```
**Using:** No facilitator ID (loads all questions)
**Status:** ✅ Correct (global question bank)

---

### 3. Load Report Mandates (Reports Sub-Tab)
**Line 820-834:**
```typescript
const loadReportMandates = async () => {
  if (!facilitatorId) return;
  
  const { data } = await supabase
    .from('reports_mandate')
    .select('*')
    .eq('facilitator_id', facilitatorId)  ← Uses facilitatorId state ⚠️
```
**Using:** facilitatorId state = **AUTH USER ID** (ad3ec5ce...)
**Table:** reports_mandate
**Status:** ⚠️ **MISMATCH** - Code uses Auth ID, table may have Profile ID

---

### 4. Configure Questions (Reports Sub-Tab)
**Line 415-429:**
```typescript
const openProgramQuestionsConfig = async (programName: string) => {
  if (!facilitatorId) return;
  
  const existingQuestions = await questionBankService.getProgramTrackingQuestions(
    facilitatorId,  ← Uses facilitatorId state ⚠️
    programName
  );
```
**Using:** facilitatorId state = **AUTH USER ID** (ad3ec5ce...)
**Table:** incubation_program_questions
**Status:** ⚠️ **MISMATCH** - Code uses Auth ID, table may have Profile ID

---

### 5. Save Program Questions Config (Reports Sub-Tab)
**Line 449-547:**
```typescript
const saveProgramQuestionsConfig = async () => {
  // Calls:
  - removeProgramQuestion(facilitatorId, ...)  ← AUTH USER ID
  - addQuestionsToProgram(facilitatorId, ...)  ← AUTH USER ID
  - updateProgramQuestionRequired(facilitatorId, ...)  ← AUTH USER ID
```
**Using:** facilitatorId state = **AUTH USER ID** (ad3ec5ce...)
**Table:** incubation_program_questions
**Status:** ⚠️ **MISMATCH** - Code uses Auth ID, table may have Profile ID

---

### 6. Create Mandate (Reports Sub-Tab)
**Line 598-656:**
```typescript
const handleCreateMandate = async () => {
  if (!facilitatorId) return;
  
  const { data, error } = await supabase
    .from('reports_mandate')
    .insert({
      facilitator_id: facilitatorId,  ← AUTH USER ID
      // ...
    })
```
**Using:** facilitatorId state = **AUTH USER ID** (ad3ec5ce...)
**Table:** reports_mandate (INSERT)
**Status:** ✅ Correct (new records will have Auth ID)

---

### 7. Load Tracking Responses (Reports Sub-Tab)
**Line 843-910:**
```typescript
const { data: responses } = await supabase
  .from('program_tracking_responses')
  .select('*')
  .eq('startup_id', numStartupId)
  .eq('facilitator_id', facilitatorId)  ← AUTH USER ID
```
**Using:** facilitatorId state = **AUTH USER ID** (ad3ec5ce...)
**Table:** program_tracking_responses
**Status:** ⚠️ **MISMATCH** - Code uses Auth ID, table may have Profile ID

---

## 📝 SUMMARY TABLE

| Feature | Tab | Function | ID Used | Table | Status |
|---------|-----|----------|---------|-------|--------|
| Load Opportunities | Intake | Line 1588 | Auth ID | incubation_opportunities | ✅ Match |
| Load Portfolio | Intake | Line 1598 | Auth ID | facilitator_startups | ✅ Match |
| Load Applications | Intake | Line 1616 | Auth ID | opportunity_applications | ✅ Match |
| **Load Recognition Records** | Track My Startups | Line 1594 | **Profile ID** | user_profiles → recognition_records | ✅ Match |
| Load Question Bank | Track My Startups | Line 800 | None | application_question_bank | ✅ Match |
| **Load Report Mandates** | Track My Startups | Line 829 | **Auth ID** | reports_mandate | ⚠️ **MISMATCH** |
| **Configure Questions (Open)** | Track My Startups | Line 429 | **Auth ID** | incubation_program_questions | ⚠️ **MISMATCH** |
| **Configure Questions (Save)** | Track My Startups | Lines 487-547 | **Auth ID** | incubation_program_questions | ⚠️ **MISMATCH** |
| **Create Mandate** | Track My Startups | Line 608 | **Auth ID** | reports_mandate | ✅ Match (new) |
| **Load Tracking Responses** | Track My Startups | Line 880 | **Auth ID** | program_tracking_responses | ⚠️ **MISMATCH** |

---

## 🔴 CRITICAL MISMATCHES FOUND:

### 1. **reports_mandate** table
- **Code uses:** Auth ID (ad3ec5ce...)
- **Old data has:** Profile ID (d3fa5dca...)
- **Result:** 0 mandates showing

### 2. **incubation_program_questions** table
- **Code uses:** Auth ID (ad3ec5ce...)
- **Old data has:** Profile ID (d3fa5dca...)
- **Result:** Configure Questions shows empty

### 3. **program_tracking_responses** table
- **Code uses:** Auth ID (ad3ec5ce...)
- **Old data has:** Profile ID (d3fa5dca...)
- **Result:** Responses not loading

---

## ✅ SOLUTION:

**Run migration script to update 3 tables from Profile ID → Auth ID:**
1. reports_mandate
2. incubation_program_questions
3. program_tracking_responses

**Script:** MIGRATE_ALL_TABLES_TO_AUTH_ID.sql

**After migration:**
- All mandates will show ✅
- All 4 programs will show ✅
- Configure Questions will work ✅
- Responses will load ✅
