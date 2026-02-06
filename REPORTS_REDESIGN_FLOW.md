# Reports Section - New Flow Design

## Current Issues to Address
1. ❌ Complex multi-step modal for creating reports
2. ❌ Unclear terminology (custom questions vs pool questions)
3. ❌ Difficult to manage report configurations
4. ❌ Hard to track report responses and startups
5. ❌ No clear separation between report creation and report management

---

## New Simplified Flow Design

### **Phase 1: CREATE REPORT** (Simplified 3-step wizard)

#### **Step 1: Basic Info**
```
Fields:
- Report Title (required)
  Example: "Q1 2025 Progress Update"
  
- Select Program (required)
  Dropdown: [All programs from incubation_opportunities]
  
- Report Year/Quarter (required)
  Options: Year dropdown + Quarter selector (Q1, Q2, Q3, Q4)
  
- Description (optional)
  Textarea: "What is this report about?"
```

#### **Step 2: Select Questions**
```
Two sections side-by-side:

LEFT: Available Questions Pool
- Search/filter by category
- Select from application_question_bank
- Shows question text + type
- Drag to right or click "Add"

RIGHT: Report Questions (Ordered)
- Shows selected questions in order
- Can reorder (drag/up-down buttons)
- Can mark as "Required" / "Optional"
- Can remove questions
- Shows count: "3/15 Questions Selected"
```

#### **Step 3: Select Target Startups**
```
- Multi-select checklist
- Shows: Startup name + Program enrollment status
- Filter by program/status
- Quick select: "All in Program" / "Clear All"
- Shows count: "5 startups selected"
```

#### **Save** 
→ Creates report in database
→ Auto-generates report_responses for each target startup
→ Redirects to Report Details page

---

### **Phase 2: MANAGE REPORTS** (List View)

#### **Reports Table/List**
```
Columns:
- Report Title
- Program Name  
- Year/Quarter
- Questions Count
- Target Startups Count
- Response Status (3/5 submitted)
- Created Date
- Actions (View | Edit | Send Reminder | Delete)

Filters:
- By Program
- By Year
- By Status (In Progress / Completed)
```

#### **Actions per Report:**

1. **View Report** → Report Details page
   - Summary stats
   - Questions listed
   - Response status per startup
   
2. **Edit Report**
   - Can modify: Title, Description
   - Can add/remove questions (if not all submitted)
   - Can extend deadline
   - Cannot change program/startups (create new report instead)
   
3. **Send Reminder**
   - Sends notification to startups with pending responses
   - Modal shows which startups will get reminder
   
4. **View Responses**
   - See all submissions
   - Filter by startup
   - Export as CSV/PDF
   
5. **Delete Report**
   - Confirmation dialog
   - Shows: "This will delete X responses"

---

### **Phase 3: VIEW RESPONSES** (Details Page)

#### **Report Header**
```
- Title, Program, Year/Quarter
- Created date, Deadline
- Status: X/Y startups submitted
- Action buttons: Edit | Send Reminder | Export | Delete
```

#### **Responses Table**
```
Columns:
- Startup Name
- Submission Status (Submitted / Pending)
- Submitted Date (if submitted)
- View/Edit Response (action)

For each submission can:
- View all answers
- Edit answers (if allowed)
- Download individual response
- Print response
```

#### **Export Options**
- All responses as CSV
- All responses as PDF (one per startup)
- Summary report (aggregated data)

---

## Implementation Steps

### **Step 1: Remove Current Flow**
1. Delete current complex modal code
2. Remove multi-step wizard if exists
3. Clean up state variables
4. Remove old custom question UI

### **Step 2: Build New Components**
```
components/
├── reports/
│   ├── ReportCreateWizard.tsx        (3-step wizard)
│   ├── ReportsList.tsx                (table view)
│   ├── ReportDetails.tsx              (detail page)
│   ├── ReportResponsesView.tsx         (responses table)
│   ├── QuestionSelector.tsx            (question picker)
│   └── StartupSelector.tsx             (startup multi-select)
```

### **Step 3: Update Service Layer**
- Simplify reportsService.ts
- Keep database operations simple
- Add response auto-generation on report creation

### **Step 4: Integrate into FacilitatorView**
- Update state management
- Wire up report creation
- Wire up report listing
- Add navigation between views

---

## Database Structure (Current)

```sql
-- Should have these tables:
CREATE TABLE reports (
  id UUID PRIMARY KEY,
  facilitator_id UUID,
  title TEXT,
  program_name TEXT,
  report_year TEXT,
  created_at TIMESTAMP
);

CREATE TABLE report_questions (
  id UUID PRIMARY KEY,
  report_id UUID,
  question_text TEXT,
  question_type TEXT,
  position INT
);

CREATE TABLE report_responses (
  id UUID PRIMARY KEY,
  report_id UUID,
  startup_id INT,
  status TEXT,
  submitted_at TIMESTAMP
);

CREATE TABLE report_answers (
  id UUID PRIMARY KEY,
  response_id UUID,
  question_id UUID,
  answer TEXT
);
```

---

## Key Differences from Current

| Aspect | Current | New |
|--------|---------|-----|
| **Creation** | Complex modal | 3-step wizard |
| **Questions** | Mixed pool/custom | Only pool questions |
| **Management** | Hidden/unclear | Clear list view |
| **Responses** | Not tracked well | Clear status tracking |
| **Editing** | Limited | Can edit most fields |
| **Export** | Not available | CSV/PDF options |

---

## Suggested Implementation Order

1. ✅ Design & approve this flow
2. Create ReportCreateWizard component
3. Create ReportsList component  
4. Create ReportDetails component
5. Integrate into FacilitatorView
6. Test all flows
7. Remove old code
8. Deploy

---

## Questions to Answer

1. Should facilitators be able to edit submitted responses? 
   → Suggest: Read-only (audit trail)

2. Should reports be deletable if responses exist?
   → Suggest: Yes, with warning

3. Should startups be able to see deadline?
   → Suggest: Yes, and get reminder 1 day before

4. Should reports auto-expire?
   → Suggest: No expiration, but can set reminder frequency

5. Can a startup respond multiple times?
   → Suggest: Only once per report (can save as draft then submit)
