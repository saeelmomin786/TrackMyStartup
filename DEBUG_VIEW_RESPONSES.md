# Debug Guide: View Responses Button Not Working

## Quick Test Steps

### 1. Open browser Console (F12 → Console tab)

### 2. Click the View button and check console

Add this temporary code at line 6753 (in the onClick):

```tsx
onClick={() => {
  console.log('=== VIEW BUTTON CLICKED ===');
  console.log('mandateStatusModalOpen:', mandateStatusModalOpen);
  console.log('startupId:', startupId);
  console.log('facilitatorId:', facilitatorId);
  console.log('reportMandates:', reportMandates);
  loadStartupResponses(mandateStatusModalOpen, startupId);
}}
```

### 3. Check State Values

Add these console.logs at the START of `loadStartupResponses` function (line ~1088):

```tsx
const loadStartupResponses = async (mandateId: string, startupId: number) => {
  console.log('=== loadStartupResponses CALLED ===');
  console.log('mandateId:', mandateId);
  console.log('startupId:', startupId);
  console.log('facilitatorId:', facilitatorId);
  console.log('Current reportMandates:', reportMandates);
  
  try {
    const mandate = reportMandates.find(m => m.id === mandateId);
    console.log('Found mandate:', mandate);
    
    if (!mandate) {
      console.log('❌ MANDATE NOT FOUND');
      return;
    }

    const questionIds = mandate.questionIds || [];
    console.log('Question IDs:', questionIds);
    console.log('Question IDs type:', typeof questionIds, Array.isArray(questionIds));
    
    if (questionIds.length === 0) {
      console.log('❌ NO QUESTION IDS');
      setMandateResponses(prev => ({
        ...prev,
        [`${mandateId}-${startupId}`]: []
      }));
      setViewResponsesMandateId(mandateId);
      setViewResponsesStartupId(startupId);
      console.log('Modal state set (empty questions)');
      return;
    }

    console.log('Fetching questions from application_question_bank...');
    const { data: questionRows, error: qError } = await supabase
      .from('application_question_bank')
      .select('id, question_text')
      .in('id', questionIds);

    console.log('Question rows:', questionRows);
    console.log('Question error:', qError);

    const questionMap = new Map(
      (questionRows || []).map(row => [String(row.id), row.question_text])
    );
    console.log('Question map:', Array.from(questionMap.entries()));

    console.log('Fetching responses from program_tracking_responses...');
    console.log('Query params:', { startupId, facilitatorId, questionIds });
    
    const { data: responses, error: responseError } = await supabase
      .from('program_tracking_responses')
      .select('question_id, answer_text, created_at')
      .eq('startup_id', startupId)
      .eq('facilitator_id', facilitatorId)
      .in('question_id', questionIds);

    console.log('Responses from DB:', responses);
    console.log('Response error:', responseError);

    if (responses) {
      const merged = responses.map((response: any) => ({
        ...response,
        question_text: questionMap.get(String(response.question_id)) || 'Question'
      }));

      console.log('Merged responses:', merged);
      const responseKey = `${mandateId}-${startupId}`;
      console.log('Setting mandateResponses with key:', responseKey);

      setMandateResponses(prev => {
        const updated = {
          ...prev,
          [responseKey]: merged
        };
        console.log('Updated mandateResponses:', updated);
        return updated;
      });
    } else {
      console.log('❌ NO RESPONSES FROM DB');
    }

    console.log('Setting modal state...');
    console.log('setViewResponsesMandateId:', mandateId);
    console.log('setViewResponsesStartupId:', startupId);
    
    setViewResponsesMandateId(mandateId);
    setViewResponsesStartupId(startupId);
    
    console.log('=== loadStartupResponses COMPLETE ===');
  } catch (error) {
    console.error('💥 ERROR:', error);
    messageService.error('Error', 'Failed to load responses');
  }
};
```

### 4. Check Modal State

Add this at the start of the View Responses Modal render (line ~6027):

```tsx
{viewResponsesMandateId && viewResponsesStartupId && (() => {
  console.log('=== MODAL RENDERING ===');
  console.log('viewResponsesMandateId:', viewResponsesMandateId);
  console.log('viewResponsesStartupId:', viewResponsesStartupId);
  
  const responseKey = `${viewResponsesMandateId}-${viewResponsesStartupId}`;
  console.log('Response key:', responseKey);
  console.log('mandateResponses:', mandateResponses);
  console.log('Responses for this key:', mandateResponses[responseKey]);
  
  const responses = mandateResponses[responseKey] || [];
  console.log('Final responses array:', responses);
  console.log('responses.length:', responses.length);
  
  const mandate = reportMandates.find(m => m.id === viewResponsesMandateId);
  
  if (!responses.length) {
    console.log('⚠️ RENDERING "No responses found" message');
    return <p className="text-slate-500">No responses found</p>;
  }

  console.log('✅ RENDERING', responses.length, 'responses');
  
  return (
    // ... rest of modal content
  );
})()}
```

## Common Issues & Solutions

### Issue 1: Modal doesn't open
- Check console for: "Modal state set"
- If missing → `setViewResponsesMandateId` isn't being called

### Issue 2: Modal opens but shows "No responses found"
- Check console for: "Responses from DB"
- If null/empty → Startup hasn't filled the form
- If error → Database query issue

### Issue 3: Modal shows responses but they're blank
- Check: "Merged responses"
- If `answer_text` is undefined → Field name mismatch in DB

### Issue 4: Button doesn't click
- Check: "VIEW BUTTON CLICKED" in console
- If missing → Button is disabled or event is blocked

## Database Check

Run this in Supabase SQL Editor to see if responses exist:

```sql
-- Check if responses exist for your startups
SELECT 
  ptr.startup_id,
  s.name as startup_name,
  ptr.facilitator_id,
  ptr.program_name,
  ptr.question_id,
  ptr.answer_text,
  ptr.created_at
FROM program_tracking_responses ptr
LEFT JOIN startups s ON s.id = ptr.startup_id
WHERE ptr.facilitator_id = 'YOUR_FACILITATOR_ID_HERE'
ORDER BY ptr.created_at DESC
LIMIT 20;

-- Check question IDs in question bank
SELECT id, question_text, category
FROM application_question_bank
LIMIT 20;

-- Check a specific mandate
SELECT * FROM reports_mandate 
WHERE facilitator_id = 'YOUR_FACILITATOR_ID_HERE'
ORDER BY created_at DESC
LIMIT 5;
```

Replace `YOUR_FACILITATOR_ID_HERE` with your actual facilitator ID.

## Expected Console Output (Success)

```
=== VIEW BUTTON CLICKED ===
mandateId: "abc-123..."
startupId: 11
=== loadStartupResponses CALLED ===
Found mandate: {title: "test 1", questionIds: [...]}
Question IDs: ["q1-uuid", "q2-uuid"]
Fetching questions...
Question rows: [{id: "q1-uuid", question_text: "What is..."}]
Fetching responses...
Responses from DB: [{question_id: "q1-uuid", answer_text: "My answer"}]
Merged responses: [{question_id: "q1-uuid", answer_text: "My answer", question_text: "What is..."}]
Setting modal state...
=== loadStartupResponses COMPLETE ===
=== MODAL RENDERING ===
Final responses array: [{...}]
✅ RENDERING 1 responses
```

## If Nothing Works

1. Check if `facilitatorId` is null → Auth issue
2. Check if `questionIds` is empty → Mandate wasn't created correctly
3. Check if responses DB table has data → Startups haven't submitted
4. Check RLS policies → Permissions blocking query
