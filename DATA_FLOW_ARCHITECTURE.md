# Data Flow Architecture - Track My Startup Questions

## Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FACILITATOR VIEW                             │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Track My Startups → Select Program → Configure Questions Btn  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                 ↓                                    │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │         Program Questions Configuration Modal                  │  │
│  │  • Browse Question Bank                                        │  │
│  │  • Select Questions                                            │  │
│  │  • Mark Required/Optional                                      │  │
│  │  • Save Configuration                                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
        ┌────────────────────────────────────────────┐
        │   questionBankService.addQuestionsToProgram │
        └────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    DATABASE: incubation_program_questions            │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ facilitator_id | program_name | question_id | is_required   │  │
│  │ uuid-123       | Accelerator  | quest-456   | true           │  │
│  │ uuid-123       | Accelerator  | quest-789   | false          │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          STARTUP VIEW                                │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ My Programs → Select Program → View Tracking Questions        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                 ↓                                    │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │          Program Tracking Questions Form                       │  │
│  │  • Question 1: [Answer Input] (Required)                      │  │
│  │  • Question 2: [Answer Input] (Optional)                      │  │
│  │  • Submit Responses                                            │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
        ┌────────────────────────────────────────────────┐
        │ questionBankService.saveProgramTrackingResponse │
        └────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                DATABASE: program_tracking_responses                  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ startup_id | facilitator_id | program_name | question_id     │  │
│  │ 347        | uuid-123       | Accelerator  | quest-456       │  │
│  │ answer_text: "We achieved 50% growth..."                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    FACILITATOR VIEW RESPONSES                        │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Track My Startups → Program → View All Responses              │  │
│  │                                                                │  │
│  │ Startup A:                                                     │  │
│  │   Q: How is your progress?                                    │  │
│  │   A: "We achieved 50% growth..."                              │  │
│  │                                                                │  │
│  │ Startup B:                                                     │  │
│  │   Q: How is your progress?                                    │  │
│  │   A: "We signed 3 new customers..."                           │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Relationships

```
┌──────────────────────────────────────────────────────────────────────┐
│                       application_question_bank                       │
│                     (Central Question Repository)                     │
│  • All questions stored here                                         │
│  • Shared across Form 2, Intake Management, Track My Startup        │
└──────────────────────────────────────────────────────────────────────┘
                                 ↓
                    ┌────────────┴────────────┐
                    │                         │
      ┌─────────────────────────┐  ┌─────────────────────────┐
      │  Form 2 Questions       │  │ Program Track Questions │
      │  (Per Opportunity)      │  │ (Per Program)           │
      └─────────────────────────┘  └─────────────────────────┘
                    │                         │
                    ↓                         ↓
      ┌─────────────────────────┐  ┌─────────────────────────┐
      │  Form 2 Responses       │  │ Program Responses       │
      │  (By Application)       │  │ (By Startup + Program)  │
      └─────────────────────────┘  └─────────────────────────┘
```

## Database Schema Relationships

```sql
application_question_bank
├── id (UUID) PRIMARY KEY
├── question_text
├── question_type
└── options

incubation_program_questions
├── id (UUID) PRIMARY KEY
├── program_name → [Program Context]
├── question_id → application_question_bank(id)
├── facilitator_id → auth.users(id)
├── is_required
├── selection_type
└── display_order

program_tracking_responses
├── id (UUID) PRIMARY KEY
├── startup_id → startups(id)
├── facilitator_id → auth.users(id)
├── program_name → [Program Context]
├── question_id → application_question_bank(id)
└── answer_text
```

## Service Layer Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    questionBankService                           │
│                                                                  │
│  Configuration Methods:                                         │
│  ├── getProgramTrackingQuestions()    ← Load configured Qs     │
│  ├── addQuestionsToProgram()          ← Save configuration     │
│  ├── removeProgramQuestions()         ← Clear configuration    │
│  ├── updateProgramQuestionOrder()     ← Reorder questions      │
│  └── updateProgramQuestionRequired()  ← Update required status │
│                                                                  │
│  Response Methods:                                              │
│  ├── saveProgramTrackingResponse()    ← Save startup answer    │
│  ├── getProgramTrackingResponses()    ← Get startup's answers  │
│  └── getAllProgramTrackingResponses() ← Get all answers        │
└─────────────────────────────────────────────────────────────────┘
```

## User Journey

### Facilitator Configuration Journey

1. Navigate to **Track My Startups** tab
2. Select **specific program** from program tabs
3. Click **Configure Questions** button
4. Modal opens with **QuestionSelector** component
5. Browse **Question Bank** (shared questions)
6. Select questions to include
7. Mark questions as **required/optional**
8. Click **Save Questions**
9. Questions saved to `incubation_program_questions`
10. Startups in that program can now see and answer questions

### Startup Response Journey (To Be Implemented)

1. Login to **Startup Dashboard**
2. Navigate to **My Programs**
3. Select assigned program
4. View **Tracking Questions** section
5. See list of questions configured by facilitator
6. Fill out answers (required questions marked with *)
7. Click **Submit Responses**
8. Answers saved to `program_tracking_responses`
9. Can update answers anytime
10. Facilitator sees latest responses

### Facilitator View Responses Journey (To Be Implemented)

1. Navigate to **Track My Startups** tab
2. Select **specific program**
3. Click **View Responses** (or similar)
4. See list of all startups with their responses
5. Filter by startup or question
6. Export to CSV for analysis
7. Add notes or follow-up actions

## Security Model (RLS Policies)

```
incubation_program_questions:
├── Facilitators: Full CRUD on their own questions
└── Startups: READ questions for their programs

program_tracking_responses:
├── Startups: Full CRUD on their own responses
└── Facilitators: READ all responses for their programs
```

## Key Features

✅ **Reuses Infrastructure**: Same question bank as Form 2
✅ **Per-Program Configuration**: Each program has unique questions
✅ **Flexible**: Required/optional, multiple question types
✅ **Secure**: RLS policies ensure data isolation
✅ **Scalable**: Unlimited programs and questions
✅ **Trackable**: Response history with timestamps
✅ **Updateable**: Startups can update responses anytime

## Technical Implementation Details

### State Management (FacilitatorView)
- `isProgramQuestionsConfigModalOpen` - Modal visibility
- `selectedProgramForQuestions` - Currently selected program
- `programQuestionIds` - Selected question IDs
- `programQuestionRequiredMap` - Required status per question
- `programQuestionSelectionTypeMap` - Selection type per question

### API Calls Pattern
```typescript
// Load configuration
const questions = await questionBankService.getProgramTrackingQuestions(
  facilitatorId, 
  programName
);

// Save configuration
await questionBankService.addQuestionsToProgram(
  facilitatorId,
  programName,
  questionIds,
  requiredMap,
  selectionTypeMap
);

// Save response
await questionBankService.saveProgramTrackingResponse(
  startupId,
  facilitatorId,
  programName,
  questionId,
  answerText
);
```

## Integration with Existing Features

- **Question Bank**: Central repository for all questions
- **Form 2**: Similar configuration workflow
- **QuestionSelector**: Reused UI component
- **Intake Management**: Same question types
- **Track My Startups**: Integrated into existing tab
- **RLS Policies**: Consistent security pattern
