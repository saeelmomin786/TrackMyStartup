# Reports System - Architecture & Data Flow

## System Components

### **1. Frontend (FacilitatorView.tsx)**

**State Variables:**
```typescript
// Track My Startups sub-tabs
trackMyStartupsSubTab: 'portfolio' | 'reports'

// Reports data
reportMandates: ReportMandate[]           // All mandates for this facilitator
mandateStats: Record<string, {            // Submission stats per mandate
  submitted: number,
  total: number
}>

// Create Report Modal
isCreateReportModalOpen: boolean
reportStep: 1 | 2 | 3                    // Step in wizard
reportTitle: string                       // Mandate title
reportProgram: string                     // Selected program
reportQuestionIds: string[]               // Selected question IDs
reportSource: 'existing' | 'startup'      // Option A or B
targetStartupIds: string[]                // Selected startups (Option B)
```

**Key Functions:**
```typescript
loadReportMandates()          // Fetch mandates from reports_mandate table
                              // Calculate stats from program_tracking_responses
                              // Update UI

handleCreateReport()          // Called on Step 3 submit
                              // If Option A: Download Excel/PDF
                              // If Option B: Create mandate + send to startups

createMandateInDB()          // Inserts into reports_mandate table
```

---

## 2. Database Schema

### **reports_mandate Table**
Stores report metadata for Option B (Send to Startups)

```sql
CREATE TABLE public.reports_mandate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facilitator_id UUID NOT NULL,                -- Auth user ID
  title VARCHAR NOT NULL,                      -- "Q1 Progress Report"
  program_name VARCHAR NOT NULL,               -- "Tech Incubation"
  question_ids TEXT[] NOT NULL,                -- Array of question IDs from question_bank
  target_startups TEXT[] NOT NULL,             -- Array of startup IDs
  source VARCHAR DEFAULT 'startup',            -- 'existing' or 'startup'
  status VARCHAR DEFAULT 'pending',            -- 'pending' | 'completed'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Example Data:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "facilitator_id": "ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd",
  "title": "Q1 2025 Progress Report",
  "program_name": "Tech Incubation",
  "question_ids": ["q1", "q2", "q3"],
  "target_startups": ["startup-001", "startup-002", "startup-003"],
  "source": "startup",
  "status": "pending",
  "created_at": "2025-02-03T10:30:00Z"
}
```

### **program_tracking_responses Table**
Stores startup responses (already exists, reused by reports system)

```sql
CREATE TABLE public.program_tracking_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id TEXT NOT NULL,               -- Startup ID
  program_name VARCHAR NOT NULL,          -- Must match mandate program
  facilitator_id UUID NOT NULL,           -- Auth user ID
  answers JSONB,                          -- {question_id: answer}
  submitted_at TIMESTAMP,                 -- When startup submitted
  last_updated_at TIMESTAMP DEFAULT NOW()
);
```

**Example Data:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "startup_id": "startup-001",
  "program_name": "Tech Incubation",
  "facilitator_id": "ad3ec5ce-5945-4c73-a562-2a0f3a8b08fd",
  "answers": {
    "q1": "We grew 50% YoY",
    "q2": "Expanded to 3 new markets",
    "q3": "Hired 10 new engineers"
  },
  "submitted_at": "2025-02-03T14:20:00Z"
}
```

### **application_question_bank Table**
Centralized question library (used by both reports and initial applications)

```sql
CREATE TABLE public.application_question_bank (
  id UUID PRIMARY KEY,
  question_text VARCHAR NOT NULL,
  question_type VARCHAR NOT NULL,       -- 'text', 'textarea', 'number', 'select', etc.
  options JSONB,                        -- For 'select' type: ["Option A", "Option B"]
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 3. Data Flow Diagrams

### **Scenario A: Generate from Existing Responses**

```
Facilitator
    ↓
Click "+ Create Report"
    ↓
[Step 1] Enter title, select program
    ↓
[Step 2] Select questions from application_question_bank
    ↓
[Step 3] Choose "Use Existing Data" (Option A)
    ↓
Click "Generate"
    ↓
System:
  1. Fetch Response 1 data (answers from application_responses)
  2. Fetch Response 2 data (answers from opportunity_form2_responses)
  3. Map to selected questions
    ↓
Generate files:
  • Excel: columns=startups, rows=questions with answers
  • PDF: summary + detailed responses
    ↓
Browser downloads both files
    ↓
[COMPLETE] Modal closes
Nothing saved to database
```

### **Scenario B: Send to Startups for New Responses**

```
Facilitator
    ↓
Click "+ Create Report"
    ↓
[Step 1] Enter title "Q1 Progress", select "Tech Incubation" program
    ↓
[Step 2] Select questions (Q1, Q2, Q3) from question_bank
    ↓
[Step 3] Choose "Send to Startups" (Option B)
    ↓
Show list of startups in Tech Incubation program
    ↓
Facilitator selects: Startup A, Startup B, Startup C
    ↓
Click "Create & Send"
    ↓
System:
  1. INSERT into reports_mandate:
     {
       title: "Q1 Progress",
       program_name: "Tech Incubation",
       question_ids: [Q1, Q2, Q3],
       target_startups: [startup-a, startup-b, startup-c],
       facilitator_id: <current user>
     }
  2. INSERT into program_tracking_responses (placeholders):
     3 records, one for each startup, all status='not_submitted'
  3. Send notifications to startups
    ↓
[COMPLETE] Modal closes
    ↓
Mandate appears in Reports tab with "Pending" status:
  "0 / 3 submitted"
    ↓
Startups see form in Track My Startups:
  - Program name: "Tech Incubation"
  - Required questions: Q1, Q2, Q3
  - Form to fill out
    ↓
Startup 1 fills all fields and clicks Submit
    ↓
System:
  1. INSERT/UPDATE program_tracking_responses:
     {
       startup_id: "startup-a",
       program_name: "Tech Incubation",
       answers: {Q1: "...", Q2: "...", Q3: "..."},
       submitted_at: NOW()
     }
    ↓
Reports tab updates automatically:
  "1 / 3 submitted"
```

---

## 4. Key Features

### **For Facilitators:**

**Creating Reports:**
✅ Two options: Generate from existing OR Send to startups
✅ Reuses centralized question library
✅ No duplicate question storage
✅ Track submission status in real-time

**Monitoring:**
✅ View all mandates in Reports tab
✅ See X/Y startups submitted
✅ Filter by program
✅ Click mandate to see detailed response tracking

### **For Startups:**

**Responding:**
✅ See active mandates in Track My Startups
✅ Access forms with selected questions
✅ Submit/update responses anytime
✅ All answers editable (not locked)

**No Burden:**
✅ Questions come from centralized system
✅ Same interface as initial application
✅ One response per mandate (evolving)

---

## 5. Current Status

### **✅ Completed:**
- Reports sub-tab added to Track My Startups
- Mandates loaded and displayed as cards
- Response tracking table shows target startups
- Submission stats calculated (X/Y submitted)
- Console logs added for debugging
- Auto-load when switching to Reports tab

### **🔄 In Progress:**
- Verifying 2 existing mandates display correctly
- Checking database connections
- Testing facilitator_id matching

### **❓ To Verify:**
1. Are your 2 mandates showing in database?
2. Do they have the correct facilitator_id?
3. Are they loading in the UI?

---

## 6. Troubleshooting Matrix

| Issue | Cause | Solution |
|-------|-------|----------|
| Mandates not showing | Empty database | Create a mandate in modal (Step 3 → Option B) |
| Mandates not showing | Wrong facilitator_id | Check auth user ID vs stored ID |
| Empty submission stats | No responses yet | Startup needs to fill form and submit |
| Error in console | Connection issue | Check Supabase permissions/RLS |

---

## Summary

The Reports system is a **lightweight mandate tracking system** that:
1. Stores report metadata in `reports_mandate`
2. Tracks startup responses in `program_tracking_responses`
3. Displays submission status in real-time
4. Reuses centralized question library (no duplication)
5. Allows facilitators to monitor progress

Your 2 mandates should be appearing in the Reports tab. If not, check:
- ✓ Auth user ID matches `facilitator_id` in database
- ✓ Reports tab was opened (to trigger `loadReportMandates()`)
- ✓ Browser console for error messages
