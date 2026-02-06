# Next Steps - Startup Response UI Implementation

## Overview
The facilitator configuration is complete. Now startups need a UI to view and answer the tracking questions configured for their program.

## Implementation Plan

### 1. Add Tracking Questions Section to Startup View

**Location:** Create a new section in the startup's program view

**Components Needed:**
```typescript
// In StartupView.tsx or similar

const [trackingQuestions, setTrackingQuestions] = useState<OpportunityQuestion[]>([]);
const [trackingResponses, setTrackingResponses] = useState<Map<string, string>>(new Map());
const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
const [isSavingResponses, setIsSavingResponses] = useState(false);
```

### 2. Load Questions for Startup's Program

```typescript
const loadProgramTrackingQuestions = async (
  facilitatorId: string, 
  programName: string
) => {
  setIsLoadingQuestions(true);
  try {
    // Get configured questions for this program
    const questions = await questionBankService.getProgramTrackingQuestions(
      facilitatorId,
      programName
    );
    setTrackingQuestions(questions);

    // Get existing responses
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const startupData = await supabase
        .from('startups')
        .select('id')
        .eq('created_by', user.id)
        .single();
      
      if (startupData.data) {
        const responses = await questionBankService.getProgramTrackingResponses(
          startupData.data.id,
          facilitatorId,
          programName
        );
        
        const responseMap = new Map<string, string>();
        responses.forEach(r => {
          responseMap.set(r.questionId, r.answerText);
        });
        setTrackingResponses(responseMap);
      }
    }
  } catch (error) {
    console.error('Error loading tracking questions:', error);
    messageService.error('Error', 'Failed to load tracking questions.');
  } finally {
    setIsLoadingQuestions(false);
  }
};
```

### 3. Render Questions Form

```typescript
<Card>
  <h3 className="text-lg font-semibold mb-4 text-slate-700">
    Program Tracking Questions
  </h3>
  
  {isLoadingQuestions ? (
    <div className="text-center py-8">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
      <p className="text-slate-500">Loading questions...</p>
    </div>
  ) : trackingQuestions.length === 0 ? (
    <p className="text-slate-500 text-sm">
      No tracking questions configured for this program yet.
    </p>
  ) : (
    <div className="space-y-6">
      {trackingQuestions.map((q, index) => {
        const question = q.question;
        if (!question) return null;

        const currentAnswer = trackingResponses.get(q.questionId) || '';

        return (
          <div key={q.questionId} className="border-b pb-4 last:border-b-0">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {index + 1}. {question.questionText}
              {q.isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>

            {/* Render input based on question type */}
            {question.questionType === 'textarea' && (
              <textarea
                value={currentAnswer}
                onChange={(e) => {
                  const newMap = new Map(trackingResponses);
                  newMap.set(q.questionId, e.target.value);
                  setTrackingResponses(newMap);
                }}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                placeholder="Enter your answer..."
                required={q.isRequired}
              />
            )}

            {question.questionType === 'text' && (
              <input
                type="text"
                value={currentAnswer}
                onChange={(e) => {
                  const newMap = new Map(trackingResponses);
                  newMap.set(q.questionId, e.target.value);
                  setTrackingResponses(newMap);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                placeholder="Enter your answer..."
                required={q.isRequired}
              />
            )}

            {question.questionType === 'number' && (
              <input
                type="number"
                value={currentAnswer}
                onChange={(e) => {
                  const newMap = new Map(trackingResponses);
                  newMap.set(q.questionId, e.target.value);
                  setTrackingResponses(newMap);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                placeholder="Enter number..."
                required={q.isRequired}
              />
            )}

            {question.questionType === 'date' && (
              <input
                type="date"
                value={currentAnswer}
                onChange={(e) => {
                  const newMap = new Map(trackingResponses);
                  newMap.set(q.questionId, e.target.value);
                  setTrackingResponses(newMap);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                required={q.isRequired}
              />
            )}

            {question.questionType === 'select' && question.options && (
              <select
                value={currentAnswer}
                onChange={(e) => {
                  const newMap = new Map(trackingResponses);
                  newMap.set(q.questionId, e.target.value);
                  setTrackingResponses(newMap);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                required={q.isRequired}
              >
                <option value="">Select an option...</option>
                {question.options.map((opt, i) => (
                  <option key={i} value={opt}>{opt}</option>
                ))}
              </select>
            )}

            {question.questionType === 'multiselect' && question.options && (
              <div className="space-y-2">
                {question.options.map((opt, i) => {
                  const selectedOptions = currentAnswer ? currentAnswer.split(',') : [];
                  const isChecked = selectedOptions.includes(opt);
                  
                  return (
                    <label key={i} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          let newSelected = [...selectedOptions];
                          if (e.target.checked) {
                            newSelected.push(opt);
                          } else {
                            newSelected = newSelected.filter(o => o !== opt);
                          }
                          const newMap = new Map(trackingResponses);
                          newMap.set(q.questionId, newSelected.filter(o => o).join(','));
                          setTrackingResponses(newMap);
                        }}
                        className="rounded border-slate-300"
                      />
                      <span className="text-sm text-slate-700">{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Show category if available */}
            {question.category && (
              <p className="text-xs text-slate-500 mt-2">
                Category: {question.category}
              </p>
            )}
          </div>
        );
      })}

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSaveTrackingResponses}
          disabled={isSavingResponses}
          className="bg-brand-primary hover:bg-brand-primary/90"
        >
          {isSavingResponses ? 'Saving...' : 'Save Responses'}
        </Button>
      </div>
    </div>
  )}
</Card>
```

### 4. Save Responses

```typescript
const handleSaveTrackingResponses = async () => {
  setIsSavingResponses(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const startupData = await supabase
      .from('startups')
      .select('id')
      .eq('created_by', user.id)
      .single();
    
    if (!startupData.data) throw new Error('Startup not found');

    // Validate required questions are answered
    const unansweredRequired = trackingQuestions.filter(q => 
      q.isRequired && !trackingResponses.get(q.questionId)?.trim()
    );

    if (unansweredRequired.length > 0) {
      messageService.warning(
        'Required Questions',
        `Please answer all required questions (${unansweredRequired.length} remaining).`
      );
      return;
    }

    // Save all responses
    const savePromises = Array.from(trackingResponses.entries()).map(
      ([questionId, answerText]) => {
        if (!answerText.trim()) return Promise.resolve(); // Skip empty answers
        
        return questionBankService.saveProgramTrackingResponse(
          startupData.data.id,
          facilitatorId, // You'll need to pass this from context
          programName,   // You'll need to pass this from context
          questionId,
          answerText
        );
      }
    );

    await Promise.all(savePromises);

    messageService.success(
      'Responses Saved',
      'Your tracking responses have been saved successfully.'
    );
  } catch (error) {
    console.error('Error saving tracking responses:', error);
    messageService.error('Error', 'Failed to save responses. Please try again.');
  } finally {
    setIsSavingResponses(false);
  }
};
```

### 5. Add to Navigation

**Option A: Add to existing program details page**
```typescript
// In the program details view, add a new tab or section
<Tabs>
  <Tab label="Overview">...</Tab>
  <Tab label="Tracking Questions">
    {/* Render tracking questions form here */}
  </Tab>
  <Tab label="Documents">...</Tab>
</Tabs>
```

**Option B: Add as a separate section on dashboard**
```typescript
// In startup dashboard
<Card>
  <h3>Program Updates</h3>
  {assignedPrograms.map(program => (
    <div key={program.name}>
      <h4>{program.name}</h4>
      <Button onClick={() => openTrackingQuestions(program)}>
        Update Tracking Questions
      </Button>
    </div>
  ))}
</Card>
```

### 6. Facilitator View Responses (Optional Enhancement)

```typescript
// In FacilitatorView, add a "View Responses" button

const handleViewProgramResponses = async (programName: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const allResponses = await questionBankService.getAllProgramTrackingResponses(
      user.id,
      programName
    );

    // Group by startup
    const byStartup = new Map<number, typeof allResponses>();
    allResponses.forEach(r => {
      if (!byStartup.has(r.startupId)) {
        byStartup.set(r.startupId, []);
      }
      byStartup.get(r.startupId)!.push(r);
    });

    // Show in modal or new view
    setResponsesData(byStartup);
    setIsResponsesModalOpen(true);
  } catch (error) {
    console.error('Error loading responses:', error);
  }
};
```

### 7. Response Display Modal

```typescript
<Modal
  isOpen={isResponsesModalOpen}
  onClose={() => setIsResponsesModalOpen(false)}
  title={`Tracking Responses - ${selectedProgramForResponses}`}
  size="large"
>
  <div className="space-y-6">
    {Array.from(responsesData.entries()).map(([startupId, responses]) => (
      <Card key={startupId}>
        <h4 className="font-semibold mb-4">
          Startup #{startupId}
        </h4>
        <div className="space-y-3">
          {responses.map(r => (
            <div key={r.questionId} className="border-b pb-3 last:border-b-0">
              <p className="text-sm font-medium text-slate-700">
                {r.question?.questionText || 'Question'}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                {r.answerText}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Last updated: {new Date(r.updatedAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </Card>
    ))}
  </div>
</Modal>
```

## File Locations

### Where to Add Startup Response UI:

1. **StartupView.tsx** - Main startup view component
   - Add new section for tracking questions
   - Load questions on program selection
   - Display form with questions
   - Handle response submission

2. **StartupDashboard.tsx** - If using separate dashboard
   - Add link/button to tracking questions
   - Show notification if questions unanswered
   - Display completion percentage

3. **ProgramDetails.tsx** - If program has detail page
   - Add tracking questions tab
   - Load questions specific to that program
   - Auto-save responses

## Database Queries Needed

```typescript
// Get startup's assigned programs with facilitator info
const { data: programs } = await supabase
  .from('facilitator_startups')
  .select(`
    program_name,
    facilitator_id,
    facilitators:user_profiles!facilitator_startups_facilitator_id_fkey(
      full_name,
      firm_name
    )
  `)
  .eq('startup_id', startupId)
  .eq('status', 'active');

// For each program, load questions
const questions = await questionBankService.getProgramTrackingQuestions(
  program.facilitator_id,
  program.program_name
);

// Load existing responses
const responses = await questionBankService.getProgramTrackingResponses(
  startupId,
  program.facilitator_id,
  program.program_name
);
```

## UI/UX Considerations

1. **Auto-save vs Manual Save:**
   - Consider auto-saving after each question
   - Or use "Save Draft" + "Submit" buttons

2. **Validation:**
   - Show required questions clearly (red asterisk)
   - Validate before submission
   - Show inline errors

3. **Progress Indicator:**
   - Show "3 of 5 questions answered"
   - Progress bar
   - Completion percentage

4. **Notifications:**
   - Notify startup when new questions added
   - Remind about unanswered required questions
   - Confirm successful submission

5. **History:**
   - Show last updated timestamp
   - Option to view previous responses
   - Track response changes over time

## Testing Checklist

- [ ] Startup can see questions for their program
- [ ] Startup can answer text questions
- [ ] Startup can answer textarea questions
- [ ] Startup can answer number questions
- [ ] Startup can answer date questions
- [ ] Startup can select single choice options
- [ ] Startup can select multiple choice options
- [ ] Required validation works
- [ ] Responses save correctly
- [ ] Responses load on page refresh
- [ ] Startup can update responses
- [ ] Facilitator can view responses
- [ ] Multiple startups don't see each other's responses
- [ ] RLS policies work correctly

## Next Phase Enhancements

1. **Response Analytics:**
   - Aggregate responses across startups
   - Generate insights and trends
   - Export to Excel/CSV

2. **Question Templates:**
   - Save frequently used question sets
   - Quick-apply templates to programs
   - Share templates across facilitators

3. **Scheduled Reminders:**
   - Send email reminders for unanswered questions
   - Recurring questions (monthly, quarterly)
   - Auto-request updates

4. **Rich Text Responses:**
   - Allow markdown formatting
   - File attachments
   - Image uploads

5. **Conditional Questions:**
   - Show/hide questions based on previous answers
   - Dynamic forms
   - Logic branching

## Support Resources

- **Question Bank Service:** [questionBankService.ts](./lib/questionBankService.ts)
- **Example Form:** See Form 2 implementation in FacilitatorView
- **Question Selector:** [QuestionSelector.tsx](./components/QuestionSelector.tsx)
- **Data Flow:** [DATA_FLOW_ARCHITECTURE.md](./DATA_FLOW_ARCHITECTURE.md)
- **Feature Summary:** [TRACK_MY_STARTUP_QUESTIONS_FEATURE_SUMMARY.md](./TRACK_MY_STARTUP_QUESTIONS_FEATURE_SUMMARY.md)
