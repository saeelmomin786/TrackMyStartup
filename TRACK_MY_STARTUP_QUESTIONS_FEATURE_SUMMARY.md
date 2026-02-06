# Track My Startup - Program Questions Configuration Feature

## Overview
This feature allows facilitators to configure custom questions for each program in the "Track My Startup" section. It uses the same question bank infrastructure as Form 2, enabling facilitators to ask startups for periodic updates and feedback.

## What Was Created

### 1. Database Tables

#### `incubation_program_questions`
Stores questions configured for each program by facilitators.

**Columns:**
- `id` (UUID, Primary Key)
- `program_name` (TEXT) - The program these questions belong to
- `question_id` (UUID) - Reference to `application_question_bank`
- `is_required` (BOOLEAN) - Whether the question is mandatory
- `selection_type` (TEXT) - 'single' or 'multiple' for select questions
- `display_order` (INTEGER) - Order of questions
- `facilitator_id` (UUID) - Facilitator who owns the questions
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**SQL File:** `CREATE_TRACK_MY_STARTUP_QUESTIONS_TABLE.sql`

#### `program_tracking_responses`
Stores startup responses to program tracking questions.

**Columns:**
- `id` (UUID, Primary Key)
- `startup_id` (INTEGER) - Reference to startups
- `facilitator_id` (UUID) - Facilitator who asked the question
- `program_name` (TEXT) - Program context
- `question_id` (UUID) - Reference to `application_question_bank`
- `answer_text` (TEXT) - Startup's answer
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**SQL File:** `CREATE_PROGRAM_TRACKING_RESPONSES_TABLE.sql`

### 2. RLS Policies

**For `incubation_program_questions`:**
- Facilitators can INSERT, UPDATE, DELETE, SELECT their own program questions
- Startups can SELECT questions for programs they're enrolled in

**For `program_tracking_responses`:**
- Startups can INSERT, UPDATE, SELECT their own responses
- Facilitators can SELECT all responses for their programs

### 3. Service Methods (questionBankService.ts)

#### Program Questions Management
- `getProgramTrackingQuestions(facilitatorId, programName)` - Get questions for a program
- `addQuestionsToProgram(facilitatorId, programName, questionIds, requiredMap, selectionTypeMap)` - Add questions to program
- `removeProgramQuestions(facilitatorId, programName)` - Remove all questions from program
- `updateProgramQuestionOrder(questionId, newOrder)` - Update question display order
- `updateProgramQuestionRequired(questionId, isRequired)` - Update required status

#### Response Management
- `saveProgramTrackingResponse(startupId, facilitatorId, programName, questionId, answerText)` - Save/update response
- `getProgramTrackingResponses(startupId, facilitatorId, programName)` - Get startup's responses
- `getAllProgramTrackingResponses(facilitatorId, programName)` - Get all responses for a program

### 4. UI Components (FacilitatorView.tsx)

#### State Variables Added
```typescript
const [isProgramQuestionsConfigModalOpen, setIsProgramQuestionsConfigModalOpen] = useState(false);
const [selectedProgramForQuestions, setSelectedProgramForQuestions] = useState<string | null>(null);
const [programQuestionIds, setProgramQuestionIds] = useState<string[]>([]);
const [programQuestionRequiredMap, setProgramQuestionRequiredMap] = useState<Map<string, boolean>>(new Map());
const [programQuestionSelectionTypeMap, setProgramQuestionSelectionTypeMap] = useState<Map<string, 'single' | 'multiple' | null>>(new Map());
const [isSavingProgramQuestions, setIsSavingProgramQuestions] = useState(false);
const [isLoadingProgramQuestionsConfig, setIsLoadingProgramQuestionsConfig] = useState(false);
```

#### Functions Added
- `openProgramQuestionsConfig(programName)` - Opens configuration modal
  - Loads existing questions for the program
  - Initializes required/selection type maps

#### UI Elements Added

**Configure Questions Button:**
- Location: Track My Startups section, next to "My Portfolio" and "Reports" buttons
- Visibility: Only shows when a specific program is selected (not "All" or "Others")
- Action: Opens the program questions configuration modal

**Program Questions Configuration Modal:**
- Title: "Configure Tracking Questions - [Program Name]"
- Components:
  - Info banner explaining the purpose
  - QuestionSelector component (reuses Form 2 question selector)
  - Save/Cancel buttons
- Functionality:
  - Select questions from question bank
  - Mark questions as required/optional
  - Set selection type for select/multiselect questions
  - Save configuration to database

## How It Works

### For Facilitators:

1. **Navigate to Track My Startups:**
   - Go to "Track My Startups" tab
   - Select a specific program (e.g., "Accelerator 2024")

2. **Configure Questions:**
   - Click "Configure Questions" button
   - Modal opens showing all available questions from the question bank
   - Select questions to ask startups in this program
   - Mark questions as required or optional
   - Click "Save Questions"

3. **View Responses:**
   - (To be implemented) View startup responses in a dedicated section
   - Filter by startup or question
   - Export responses for analysis

### For Startups:

1. **Access Program:**
   - Log into startup dashboard
   - Navigate to assigned program

2. **Answer Questions:**
   - (To be implemented) See configured questions for the program
   - Fill out answers
   - Submit responses

3. **Update Responses:**
   - Can edit and update responses at any time
   - Facilitator sees latest version

## Integration Points

### Existing Features Used:
- **Question Bank:** Reuses the same question bank as Form 2 and Intake Management
- **QuestionSelector Component:** Same UI component used for configuring questions
- **Question Types:** Supports all question types (text, textarea, number, date, select, multiselect)
- **RLS Policies:** Follows same security pattern as other features

### Similar to Form 2:
- Same configuration workflow
- Same modal structure
- Same state management pattern
- Same database structure (questions + responses)

## Database Migration Steps

To enable this feature, run the following SQL files in order:

1. **CREATE_TRACK_MY_STARTUP_QUESTIONS_TABLE.sql**
   - Creates `incubation_program_questions` table
   - Adds RLS policies for facilitators and startups
   - Creates indexes for performance

2. **CREATE_PROGRAM_TRACKING_RESPONSES_TABLE.sql**
   - Creates `program_tracking_responses` table
   - Adds RLS policies for startups and facilitators
   - Creates indexes for performance

## Next Steps (For Complete Implementation)

### 1. Startup Response UI
Create a section where startups can:
- View questions configured for their program
- Submit answers to required questions
- Update their answers
- See submission history

### 2. Facilitator Response Viewing
Create a section where facilitators can:
- View all responses from startups in a program
- Filter by startup or question
- Export responses to CSV/Excel
- Add notes or comments on responses

### 3. Analytics & Insights
Add features for:
- Response completion rates
- Question analytics (most answered, most skipped)
- Trend analysis over time
- Comparison across programs

### 4. Notifications
Implement notifications for:
- New questions assigned to startups
- Startup submits/updates responses
- Overdue responses (if deadlines added)

## Testing Checklist

- [ ] Run CREATE_TRACK_MY_STARTUP_QUESTIONS_TABLE.sql
- [ ] Run CREATE_PROGRAM_TRACKING_RESPONSES_TABLE.sql
- [ ] Verify tables created successfully
- [ ] Test Configure Questions button appears for specific programs
- [ ] Test opening configuration modal
- [ ] Test selecting questions from question bank
- [ ] Test saving question configuration
- [ ] Test loading existing question configuration
- [ ] Test removing all questions from a program
- [ ] Test with multiple programs
- [ ] Verify RLS policies work correctly
- [ ] Test as facilitator and startup user

## Benefits

1. **Centralized Tracking:** All program questions in one place
2. **Flexible Configuration:** Each program can have different questions
3. **Reuses Infrastructure:** Leverages existing question bank
4. **Easy Maintenance:** Same workflow as Form 2
5. **Scalable:** Can add unlimited questions and programs
6. **Secure:** RLS policies ensure data isolation
7. **User-Friendly:** Familiar UI for facilitators

## Notes

- Questions are program-specific and facilitator-specific
- Each facilitator can configure different questions for the same program name
- Startups can update their responses at any time
- Response history is maintained (created_at vs updated_at)
- Questions can be removed without losing historical responses
- Uses UPSERT pattern for responses (one answer per question per startup per program)
