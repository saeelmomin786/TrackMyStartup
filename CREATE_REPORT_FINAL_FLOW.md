# Create Report - Final Flow (Complete)

## 📋 User Journey

### **Entry Point**
Facilitator clicks **+ Create Report** button in Reports section

---

## **STEP 1: BASIC INFO**

### Input Fields
```
1. Report Title *
   - Text input
   - Example: "Q1 2025 Progress Report"
   - Required

2. Select Program *
   - Dropdown menu
   - Options: [All Programs] + [Program 1] + [Program 2] + ...
   - If "All Programs" selected → use all startups from all programs
   - If specific program selected → use only that program's startups
   - Required
```

### Button
- **Next** (disabled if fields empty)
- **Cancel**

---

## **STEP 2: SELECT QUESTIONS**

### Display
- Show **all questions from Question Bank** (centralized system)
- Questions from `application_question_bank` table
- Display: Question text + type + options (if applicable)

### Interaction
- Incubation center **selects required questions**
- Checkboxes next to each question
- Shows selected count: **"X questions selected"**

### Button
- **Next** (disabled if no questions selected)
- **Back**
- **Cancel**

---

## **STEP 3: GENERATE SOURCE**

### Question
**"Where should the answers come from?"**

### Option A - Use Existing Responses
```
Label: "Use Existing Data"
Description: "Pull answers from previous responses (Response 1 & Response 2)"

When selected:
- No further action needed
- Click "Generate" below
- Creates Excel + PDF immediately
- Downloads file
- Does NOT save in Supabase
```

### Option B - Ask Startups
```
Label: "Send to Startups"
Description: "Startups will fill out the form with their answers"

When selected:
- **Show list of target startups**
  - From selected program (or all programs)
  - Checkboxes to select/deselect
  - Shows count: "X startups selected"
  - "Select All" / "Deselect All" buttons
  
- **Create mandate in Supabase**
  - Report ID, Title, Program
  - Target startups list
  - Status: "pending" (no responses yet)
  
- Startups will see form with selected questions
- Form uses **centralized Configure Questions system**
- Startups submit/update answers
- Mandate tracks: submitted / not submitted
```

### Button
- **Generate** (for Option A)
- **Create & Send** (for Option B)
- **Back**
- **Cancel**

---

## **WORKFLOW FOR OPTION A: Use Existing Responses**

```
1. Incubation selects Option A
2. Click "Generate"
3. System:
   - Fetches answers from Response 1 & Response 2
   - Pulls selected questions from centralized Question Bank
   - Maps answers to questions
   - Generates Excel sheet
   - Generates PDF
4. File downloads automatically
5. Nothing saved in Supabase
6. Dialog closes
```

### Excel Format
```
Columns: Question | Response 1 Answer | Response 2 Answer | ...
Rows: Each selected question
```

### PDF Format
```
Title: [Report Title]
Program: [Program Name]
Generated: [Date]
Questions and Answers from existing responses
```

---

## **WORKFLOW FOR OPTION B: Send to Startups (Mandate)**

### **Phase 1: Create Mandate**
```
1. Incubation selects Option B
2. Incubation selects target startups
3. Click "Create & Send"
4. System saves in Supabase:
   - Table: reports_mandate
   - Fields:
     - id (UUID)
     - facilitator_id
     - title
     - program_name
     - centralized_question_system_id (reference)
     - target_startups (JSON array of startup IDs)
     - created_at
     - status (changes when all startups submit)

5. Modal closes
6. Report appears in "Active Reports" section
7. Status shows: "Pending - 0/5 submitted"
```

### **Phase 2: Startups Respond**

**First Time (New Mandate):**
```
1. Startup receives notification: "New Report: Q1 2025 Progress Report"
2. Startup opens form in their Track My Startups tab
3. Form shows all selected questions from centralized system
4. Questions come from: centralized Configure Questions
5. Startup fills ALL fields (A, B, C)
6. Startup submits
7. System creates ONE response record:
   - Table: program_tracking_responses
   - Fields:
     - startup_id, program_name, facilitator_id
     - answers JSON: {A: "...", B: "...", C: "..."}
     - submitted_at
     - last_updated_at
```

**Second Time (Same Mandate, More Questions Added):**
```
1. Incubation wants to add questions (D, E)
2. Updates centralized Configure Questions for that program
3. Same mandate now references MORE questions
4. Startup sees form with: A, B, C, D, E (FULL FORM)
5. Startup can UPDATE any answer (A, B, C, D, E editable)
6. Old answers NOT locked - fully modifiable
7. Click "Submit"
8. System UPDATES same response:
   - Same response record ID
   - answers JSON updated: {A: "new", B: "new", C: "new", D: "...", E: "..."}
   - last_updated_at = now()
   - NO new response created
```

### **Phase 3: Monitor Submissions**

**Incubation Dashboard Shows:**
```
Report: Q1 2025 Progress Report
Program: Tech Incubation
Created: Feb 3, 2025
Status: In Progress

Submitted: ✅ Startup A (Feb 3, 10:30 AM)
         ✅ Startup B (Feb 3, 2:15 PM)
         ⏳ Startup C (Pending)
         ⏳ Startup D (Pending)
         ⏳ Startup E (Pending)

Progress: 2/5 submitted (40%)
```

### **Phase 4: Generate Report**

**When All Startups Submit (or Incubation Chooses):**
```
1. Click "Generate Report"
2. System:
   - Fetches all responses for this mandate
   - Pulls questions from centralized system
   - Maps each startup's answers to questions
   - Generates Excel sheet
   - Generates PDF
3. File downloads
4. Report is saved as generated file only
   - NOT stored in Supabase (file is local)
5. Mandate tracking remains in Supabase
```

### Excel Format
```
Sheet 1: Summary
- Report Title, Program, Created Date, Generated Date
- Startup names + Submission status

Sheet 2: Responses
Columns: Question | Startup A | Startup B | Startup C | ...
Rows: Each selected question with answers
```

### PDF Format
```
Page 1: Summary
- Report Title, Program, Created Date
- Submission status table
- X/Y startups submitted

Pages 2+: Detailed Responses
- Each startup's responses on separate section
- Questions with answers
- Submission timestamp
```

---

## **DATA STORAGE (Supabase)**

### **Only Save (Option B):**

**Table: reports_mandate**
```sql
id (UUID)
facilitator_id (UUID)
title (VARCHAR)
program_name (VARCHAR)
centralized_system_reference (if needed)
target_startups (JSON array)
created_at (TIMESTAMP)
status (VARCHAR) -- pending / completed
```

**Existing Table: program_tracking_responses**
```sql
-- Already exists, reuse for startup answers
id (UUID)
startup_id (INT)
program_name (VARCHAR)
facilitator_id (UUID)
answers (JSONB) -- {question_id: answer}
submitted_at (TIMESTAMP)
last_updated_at (TIMESTAMP)
```

### **Do NOT Save:**
- Question copies (use centralized Question Bank reference)
- Generated Excel/PDF files (user downloads, keeps locally)
- Report history (unless generating from existing responses)

---

## **KEY FEATURES**

✅ **Option A (Existing Responses)**
- Instant report generation
- No Supabase storage
- Downloads Excel + PDF
- Single step (select questions, generate)

✅ **Option B (Send to Startups)**
- Lightweight mandate tracking
- Reuses centralized question system
- One response per startup (evolving)
- Startups can update all answers
- Track submission status
- Generate Excel + PDF on demand

✅ **Centralized Question System Integration**
- Questions always current
- No question duplication
- Multiple reports can reference same questions
- Startup sees latest question set each time

✅ **Multiple Reports Same Program**
- Each report is separate mandate
- Each can add/remove questions
- Startups update answers for each report independently
- Answers stored per report context

---

## **UI MOCKUP**

```
┌─────────────────────────────────────┐
│ CREATE REPORT - STEP 1/3: BASIC INFO│
├─────────────────────────────────────┤
│                                      │
│ Report Title *                       │
│ [________________Q1 2025 Progress___]│
│                                      │
│ Select Program *                     │
│ [▼ All Programs ____________...]     │
│                                      │
│                  [Back] [Next] [✕]   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ CREATE REPORT - STEP 2/3: QUESTIONS │
├─────────────────────────────────────┤
│ Selected: 3 questions                │
│                                      │
│ ☐ What is your revenue?             │
│ ☑ What is your burn rate?           │
│ ☑ How many employees?               │
│ ☐ Market size estimate?             │
│ ☑ Growth metrics?                   │
│                                      │
│              [Back] [Next] [✕]       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ CREATE REPORT - STEP 3/3: SOURCE    │
├─────────────────────────────────────┤
│                                      │
│ Where should answers come from?     │
│                                      │
│ ○ Use Existing Data                 │
│   Pull from Response 1 & 2          │
│                                      │
│ ● Send to Startups                  │
│   Startups fill the form            │
│                                      │
│   Startups to include:              │
│   ☑ Startup A                       │
│   ☑ Startup B                       │
│   ☑ Startup C                       │
│   Selected: 3                        │
│                                      │
│      [Back] [Create & Send] [✕]     │
└─────────────────────────────────────┘
```

---

## **IMPLEMENTATION CHECKLIST**

- [ ] Create ReportCreateWizard component
- [ ] Step 1: Basic Info (title + program)
- [ ] Step 2: Question selection
- [ ] Step 3: Generate source selection
- [ ] Option A: Generate Excel + PDF logic
- [ ] Option B: Create mandate in Supabase
- [ ] Option B: Send form to startups
- [ ] Integrate with centralized question system
- [ ] Create reports_mandate table (if not exists)
- [ ] Display active reports + status
- [ ] Add "Generate Report" button (on demand)
- [ ] Test all flows
