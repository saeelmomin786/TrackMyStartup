# CREATE REPORT - FINAL COMPLETE FLOW (Comprehensive)

---

## 📌 **OVERVIEW**

Create report with 2 sources:
- **Option A**: Use existing responses (Response 1 & 2) → Download Excel + PDF immediately
- **Option B**: Send to startups using their program's ALREADY CONFIGURED questions

---

## 🔄 **COMPLETE FLOW**

### **STEP 1: REPORT TITLE**

```
Input: Report Title (required)
Example: "Q1 2025 Progress Report"

Button: Next
```

---

### **STEP 2: SELECT PROGRAM**

```
Input: Program Dropdown (required)
Options:
  - All Programs
  - Tech Incubation
  - Finance Track
  - Growth Program
  - [etc.]

Button: Next
```

---

### **STEP 3: CHOOSE DATA SOURCE**

#### **Option A: Use Existing Responses**

```
Label: "Use Existing Data"
Description: "Pull answers from Response 1 & Response 2"

When Selected:
  - No further input needed
  - Click "Generate" → Instant Excel + PDF download
  - Does NOT save anything in Supabase
  - File downloaded, conversation ends
```

---

#### **Option B: Send to Startups**

```
Label: "Send to Startups"
Description: "Startups will fill out form with their answers"

Prerequisites (System Check):
  ✓ If selected program has Configure Questions configured
    → Proceed to next step
  
  ✗ If selected program has NO Configure Questions
    → Show error: "Please configure questions for this program first"
    → Link to: "Configure Tracking Questions"
    → Cannot proceed with Option B

When Proceeding with Option B:
  
  Step 3.1: Show Configured Questions
  ────────────────────────────────
  - Display questions already configured in "Configure Tracking Questions"
  - Show question text only
  - Display: "This program has 5 questions configured"
  - Questions CANNOT be modified here (must use Configure Questions)
  - Button: "Confirm & Continue"
  
  Step 3.2: Select Target Startups
  ────────────────────────────────
  Display list:
    ☑ Startup A (Active in this program)
    ☑ Startup B (Active in this program)
    ☐ Startup C (Active in this program)
    
  - "Select All" button
  - "Deselect All" button
  - Show count: "3 startups selected"
  - Required: At least 1 startup selected
  
  Button: "Create Mandate"
```

---

## 📊 **WHAT HAPPENS IN EACH OPTION**

### **OPTION A WORKFLOW: Use Existing Responses**

```
Step-by-Step:
1. Facilitator enters Report Title
2. Selects Program
3. Selects "Option A: Use Existing Data"
4. Clicks "Generate"

System Actions:
  ✓ Fetches answers from Response 1 & Response 2
  ✓ Pulls questions from incubation_program_questions 
    (for reference only)
  ✓ Maps answers to questions
  ✓ Generates Excel sheet
  ✓ Generates PDF
  ✓ Triggers browser download

Result:
  📥 Excel file downloaded
  📥 PDF file downloaded
  ❌ Nothing saved in Supabase
  ✅ Modal closes
```

---

### **OPTION B WORKFLOW: Send to Startups**

#### **Phase 1: Create Mandate**

```
Step-by-Step:
1. Facilitator enters Report Title
2. Selects Program
3. Selects "Option B: Send to Startups"
4. System checks: Does program have Configure Questions?
   - YES → Show them
   - NO → Error, can't proceed
5. Facilitator confirms questions (cannot edit)
6. Selects target startups (checkboxes)
7. Clicks "Create Mandate"

System Actions:
  ✓ Saves mandate in Supabase:
    Table: reports_mandate
    {
      id: UUID,
      facilitator_id: UUID,
      title: "Q1 2025 Progress Report",
      program_name: "Tech Incubation",
      target_startups: [1, 2, 3],  -- startup IDs
      created_at: timestamp,
      status: "pending"
    }
  ✓ Creates notification for each startup
  ✓ Modal closes
  ✓ Shows in "Active Mandates" list

Status Display:
  Report: Q1 2025 Progress Report
  Program: Tech Incubation
  Submissions: 0/3 (Pending)
  Questions: 5 (from Configure Questions)
  Created: Feb 3, 2025
```

---

#### **Phase 2: Startups Respond**

**FIRST TIME (Initial Submission):**

```
1. Startup A receives notification
2. Opens their Track My Startups dashboard
3. Sees form with 5 questions (from Configure Questions)
4. Fills all answers
5. Clicks "Submit"

System:
  ✓ Creates response record in program_tracking_responses:
    {
      startup_id: 1,
      program_name: "Tech Incubation",
      facilitator_id: UUID,
      answers: {
        q1: "answer",
        q2: "answer",
        q3: "answer",
        q4: "answer",
        q5: "answer"
      },
      submitted_at: timestamp,
      last_updated_at: timestamp
    }
  ✓ Mandate status updates: "1/3 submitted"
```

**SECOND TIME (Same Program, More Questions Added):**

```
Scenario: Facilitator adds 2 more questions (Q6, Q7) 
         via Configure Tracking Questions

What Happens:
1. Same Startup A opens form again
2. Now sees: 7 questions (Q1-Q7)
3. Q1-Q5 show their previous answers (pre-filled)
4. Q6-Q7 are empty (new)
5. Startup CAN edit Q1-Q5 (answers are NOT locked)
6. Fills Q6-Q7
7. Clicks "Update"

System:
  ✓ UPDATES existing response (same record):
    {
      startup_id: 1,
      program_name: "Tech Incubation",
      facilitator_id: UUID,
      answers: {
        q1: "NEW answer (updated)",
        q2: "NEW answer (updated)",
        q3: "NEW answer (updated)",
        q4: "NEW answer (updated)",
        q5: "NEW answer (updated)",
        q6: "NEW answer",
        q7: "NEW answer"
      },
      submitted_at: original_timestamp,
      last_updated_at: new_timestamp
    }
  ✓ NO new response created
  ✓ One response per startup (always)
```

---

#### **Phase 3: Monitor Submissions**

```
Dashboard Shows:
┌──────────────────────────────────┐
│ Active Mandate                   │
├──────────────────────────────────┤
│ Report: Q1 2025 Progress         │
│ Program: Tech Incubation         │
│ Created: Feb 3, 10:00 AM         │
│                                  │
│ Progress: 2/3 submitted (67%)    │
│                                  │
│ ✅ Startup A (Feb 3, 10:30 AM)   │
│ ✅ Startup B (Feb 3, 11:15 AM)   │
│ ⏳ Startup C (Pending)           │
│                                  │
│ Questions: 5 (View Details)      │
│                                  │
│ [Generate Report] [Send Reminder]│
│ [View Responses] [Delete]        │
└──────────────────────────────────┘
```

---

#### **Phase 4: Generate Final Report**

```
When All Startups Submit (or Anytime):
1. Click "Generate Report"

System:
  ✓ Fetches all responses for this mandate
  ✓ Pulls question details from incubation_program_questions
  ✓ Maps each startup's answers
  ✓ Generates Excel sheet
  ✓ Generates PDF
  ✓ Triggers download

Excel Format:
┌─────────────────────────────────────┐
│ Q1 2025 Progress Report             │
│ Program: Tech Incubation            │
│ Generated: Feb 3, 2025              │
├─────────────────────────────────────┤
│ Q#  | Question         | Startup A | Startup B | Startup C |
├─────────────────────────────────────┤
│ 1   | Revenue?         | 500K      | 300K      | 700K      |
│ 2   | Burn Rate?       | 50K       | 75K       | 25K       |
│ 3   | Employees?       | 15        | 8         | 20        |
│ 4   | Growth %?        | 25%       | 40%       | 15%       |
│ 5   | Key Metrics?     | DAU: 10K  | Users: 5K | MRR: 100K |
└─────────────────────────────────────┘

PDF Format:
┌─────────────────────────────────────┐
│ Q1 2025 PROGRESS REPORT             │
│ Tech Incubation Program             │
│ Generated: Feb 3, 2025              │
│                                     │
│ SUMMARY                             │
│ - Created: Feb 3, 10:00 AM         │
│ - Submissions: 2/3 (1 pending)     │
│ - Questions: 5                      │
│                                     │
│ ─────────────────────────────────  │
│                                     │
│ STARTUP A RESPONSES                 │
│ Submitted: Feb 3, 10:30 AM         │
│                                     │
│ Q1: Revenue? → 500K                │
│ Q2: Burn Rate? → 50K               │
│ Q3: Employees? → 15                │
│ Q4: Growth %? → 25%                │
│ Q5: Key Metrics? → DAU: 10K        │
│                                     │
│ ─────────────────────────────────  │
│                                     │
│ STARTUP B RESPONSES                 │
│ Submitted: Feb 3, 11:15 AM         │
│ [Answers...]                        │
│                                     │
│ ─────────────────────────────────  │
│                                     │
│ STARTUP C RESPONSES                 │
│ Status: Pending (not submitted)     │
│                                     │
└─────────────────────────────────────┘

Result:
  📥 Excel file downloaded
  📥 PDF file downloaded
  ✓ Files saved locally (not in Supabase)
  ✓ Mandate still tracked in Supabase
```

---

## 💾 **DATABASE STORAGE**

### **Save in Supabase:**

**Table: reports_mandate**
```sql
id (UUID) PRIMARY KEY
facilitator_id (UUID) -- which facilitator created it
title (VARCHAR) -- Report title
program_name (VARCHAR) -- Which program
target_startups (JSON) -- [1, 2, 3] startup IDs
created_at (TIMESTAMP)
status (VARCHAR) -- pending / completed
```

**Table: program_tracking_responses** (Already exists)
```sql
-- Reused from Track My Startups
startup_id (INT)
program_name (VARCHAR)
facilitator_id (UUID)
answers (JSONB) -- {q1: "...", q2: "...", ...}
submitted_at (TIMESTAMP)
last_updated_at (TIMESTAMP)
```

### **Do NOT Save:**
- ❌ Question copies/details
- ❌ Excel files
- ❌ PDF files
- ❌ Report history (unless generating from existing responses)

---

## 🔗 **SYSTEM CONNECTIONS**

```
┌─────────────────────────────────────────────┐
│ APPLICATION_QUESTION_BANK (Master)          │
│ - Question definitions (one source)         │
└─────────────────────────────────────────────┘
                       ▲
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼──────────────┐   ┌──────────▼────────────┐
│ INCUBATION_PROGRAM_  │   │ PROGRAM_TRACKING_     │
│ QUESTIONS            │   │ RESPONSES             │
│ (Program config)     │   │ (Startup answers)     │
│ - Facilitator        │   │ - startup_id          │
│ - Program name       │   │ - answers JSON        │
│ - Question IDs       │   │ - submitted_at        │
│ - Order/required     │   │ - last_updated_at     │
└───────┬──────────────┘   └──────────┬────────────┘
        │                             │
        └──────────┬──────────────────┘
                   │
         ┌─────────▼────────────┐
         │ REPORTS_MANDATE      │
         │ (For tracking only)  │
         │ - title              │
         │ - program_name       │
         │ - target_startups    │
         │ - status             │
         └──────────────────────┘
```

---

## ✅ **FEATURE CHECKLIST**

**Option A:**
- ✅ Select program
- ✅ Fetch Response 1 & Response 2
- ✅ Generate Excel
- ✅ Generate PDF
- ✅ Download
- ✅ No Supabase save

**Option B:**
- ✅ Check program has Configure Questions
- ✅ Show configured questions (read-only)
- ✅ Select startups
- ✅ Create mandate in Supabase
- ✅ Startups fill form (first time)
- ✅ Startups update form (subsequent times)
- ✅ One response per startup (evolving)
- ✅ Track submission status
- ✅ Generate Excel on demand
- ✅ Generate PDF on demand
- ✅ Download

---

## 🎯 **KEY PRINCIPLES**

1. **No Duplication** ← Questions from Configure Questions only
2. **One Response** ← Per startup per program (evolves)
3. **Editable Answers** ← All old answers can be updated
4. **Lightweight Tracking** ← Only mandate saved, not questions
5. **On-Demand Generation** ← Excel/PDF created when needed
6. **Centralized System** ← Uses incubation_program_questions always

---

## 📝 **READY?**

Is this flow clear? Say **"BUILD"** and I'll implement:
1. ReportCreateWizard component
2. Remove current report code
3. Integrate with existing systems
4. Test all workflows
