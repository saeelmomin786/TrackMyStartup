# Reports System Refactoring - COMPLETE

## Overview
Successfully refactored the entire Reports section from the old custom report system to a new 3-step wizard flow with centralized question management and lightweight mandate tracking.

## What Changed

### ✅ Removed
- **reportsService** import and all associated service calls
- **Old state variables** (15+ variables):
  - `newReportTitle`, `newReportProgram`, `newReportYear`
  - `reportQuestions`, `selectedPoolQuestions`
  - `reportResponses`, `selectedResponses`
  - `isReportModalOpen`, `isReportResponsesModal`
  - All old report loading/filtering logic
  
- **Old type definitions**:
  - `ReportQuestion` (custom question type)
  - `StartupReport` (old report wrapper)
  
- **Old handler functions**:
  - `handleAddPoolQuestionToReport()`
  - `handleAddCustomQuestionToReport()`
  - `handleRemoveQuestionFromReport()`
  - All old report modal handlers

- **Old report display logic**:
  - Reports list showing custom question details
  - Response selection UI
  - Report export from custom questions

### ✅ Added

#### New State Management
```typescript
const [isCreateReportModalOpen, setIsCreateReportModalOpen] = useState(false);
const [reportStep, setReportStep] = useState<1 | 2 | 3>(1);
const [reportTitle, setReportTitle] = useState('');
const [reportProgram, setReportProgram] = useState('');
const [reportQuestionIds, setReportQuestionIds] = useState<string[]>([]);
const [allReportQuestions, setAllReportQuestions] = useState<ApplicationQuestion[]>([]);
const [isLoadingReportQuestions, setIsLoadingReportQuestions] = useState(false);
const [reportSource, setReportSource] = useState<'existing' | 'startup' | ''>('');
const [targetStartupIds, setTargetStartupIds] = useState<string[]>([]);
const [reportMandates, setReportMandates] = useState<ReportMandate[]>([]);
const [mandateStats, setMandateStats] = useState<Record<string, { submitted: number; total: number }>>({});
```

#### New Type Definition
```typescript
type ReportMandate = {
  id: string;
  facilitator_id: string;
  title: string;
  program_name: string;
  program_list?: string[];
  question_ids: string[];
  target_startups: string[];
  source: 'existing' | 'startup';
  created_at: string;
};
```

#### New Handler Functions
1. **resetCreateReportModal()** - Resets all form state
2. **getProgramOptions()** - Returns available programs + "All Programs"
3. **getSelectedPrograms()** - Returns selected program(s) based on selection
4. **getTargetStartupsForPrograms()** - Maps programs to target startup IDs
5. **handleNextStep()** - Validates and moves to next step (Steps 1→2→3)
6. **handleBackStep()** - Returns to previous step
7. **downloadCsv()** - Exports existing responses as CSV
8. **downloadPdf()** - Exports existing responses as PDF
9. **handleGenerateExistingReport()** - Option A: Generates report from existing responses
10. **handleCreateMandate()** - Option B: Creates mandate, merges questions, sends to startups
11. **handleCreateReport()** - Final handler that calls appropriate option handler

#### New useEffect Hooks
1. **Load Report Mandates** - Fetches mandates from Supabase when modal opens
2. **Compute Mandate Stats** - Calculates submission status from program_tracking_responses

#### New 3-Step Wizard Modal
- **Step 1**: Title + Program selection
- **Step 2**: Question selection from centralized question bank
- **Step 3**: Source selection (Existing Responses vs Send to Startups)

#### New Reports Display
- Replaced reports list with **reportMandates list**
- Shows submission stats: `{submitted} / {total}` startups
- Displays mandate metadata (title, program, creation date)

### ✅ Database Schema

Created `CREATE_REPORTS_MANDATE_TABLE.sql`:
```sql
CREATE TABLE public.reports_mandate (
  id UUID PRIMARY KEY,
  facilitator_id UUID (FK to auth.users),
  title TEXT NOT NULL,
  program_name TEXT NOT NULL,
  program_list JSONB,
  question_ids JSONB NOT NULL,
  target_startups JSONB NOT NULL,
  source TEXT ('existing' | 'startup'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS Policy**: Facilitators can only manage their own mandates

## How It Works

### Option A: Generate from Existing Responses
1. Select Title + Program + Questions
2. Choose "Existing Responses" source
3. System fetches Response 1 & Response 2 from `program_tracking_responses`
4. Generates CSV export of all responses
5. Generates PDF export with formatted responses
6. **No mandate created** - one-time export

### Option B: Create Mandate & Send to Startups
1. Select Title + Program + Questions
2. Choose "Send to Startups" source
3. Select target startups
4. System creates mandate record in `reports_mandate` table
5. Auto-merges missing questions into selected program(s)
6. Sends mandate to startups to respond
7. Tracks submissions via `program_tracking_responses`
8. Shows submission stats: "3 / 5 submitted"

## Integration Points

### Services Used
- `questionBankService.getAllQuestions()` - Get all available questions
- `questionBankService.getProgramTrackingQuestions()` - Get program's questions
- `questionBankService.addQuestionsToProgram()` - Merge missing questions
- `form2ResponseService.getResponsesByStartupProgram()` - Fetch existing responses
- `supabase` - CRUD operations on `reports_mandate` table

### Tables Referenced
- `application_question_bank` - Source of questions
- `incubation_program_questions` - Program question sets
- `program_tracking_responses` - Actual responses from startups
- `reports_mandate` - Mandate metadata (NEW)

## Testing Checklist

- [ ] Step 1: Can enter title and select program
- [ ] Step 2: Questions load from question bank
- [ ] Step 2: Can select/deselect multiple questions
- [ ] Step 3: Source selection works (Existing / Startup)
- [ ] Option A: CSV downloads with Response 1 & 2
- [ ] Option A: PDF downloads with formatted responses
- [ ] Option B: Mandate creates in Supabase
- [ ] Option B: Missing questions merge into program's Configure Questions
- [ ] Option B: Submission stats update as startups respond
- [ ] Mandate list displays with correct stats
- [ ] Modal closes and resets on completion
- [ ] Modal closes and resets on cancel

## Files Modified

1. **components/FacilitatorView.tsx** (6822 lines)
   - Removed ~300 lines of old report code
   - Added ~350 lines of new wizard code
   - Net +50 lines (focused on core logic)

2. **CREATE_REPORTS_MANDATE_TABLE.sql** (NEW)
   - Database schema for mandate tracking
   - RLS policies for security

## Migration Notes

**Database Changes Required:**
1. Run `CREATE_REPORTS_MANDATE_TABLE.sql` to create the new table
2. No data migration needed - old reports were stored differently

**Code Changes:**
- Old `reportsService` is no longer used and can be deleted if not referenced elsewhere
- No changes needed to other components (Reports is self-contained)

## Key Design Decisions

1. **Lightweight Mandate Table** - Only stores metadata, no question duplication
2. **Centralized Questions** - Uses existing `application_question_bank` system
3. **Single Response Per Startup** - Reuses `program_tracking_responses` (editable, evolves)
4. **Question Merging** - Automatically adds missing questions to program configurations
5. **No Report Duplication** - Mandates are "requirements", responses are "submissions"

## Status
✅ **COMPLETE AND READY FOR TESTING**

All code is syntactically valid. No compilation errors. Ready to execute database migration and test both Option A and Option B flows.
