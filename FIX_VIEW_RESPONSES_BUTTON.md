# Fix View Responses Button

## Issue
The View button is incorrectly nested inside the status span tag, causing layout and functionality issues.

## Fix Required

In FacilitatorView.tsx around line 6747, change this:

```tsx
<span className={`text-xs font-medium ${isSubmitted ? 'text-green-600' : 'text-slate-500'}`}>
  {isSubmitted ? 'Submitted' : 'Pending'}
  {isSubmitted && (
    <Button
      size="sm"
      variant="outline"
      onClick={() => loadStartupResponses(mandateStatusModalOpen, startupId)}
      className="text-blue-600 border-blue-600 hover:bg-blue-50 h-6"
    >
      View
    </Button>
  )}
</span>
```

To this:

```tsx
<span className={`text-xs font-medium ${isSubmitted ? 'text-green-600' : 'text-slate-500'}`}>
  {isSubmitted ? 'Submitted' : 'Pending'}
</span>
{isSubmitted && (
  <Button
    size="sm"
    variant="outline"
    onClick={() => {
      console.log('🔍 View clicked for startup:', startupId, 'mandate:', mandateStatusModalOpen);
      loadStartupResponses(mandateStatusModalOpen, startupId);
    }}
    className="text-blue-600 border-blue-600 hover:bg-blue-50 h-6 ml-2"
  >
    View
  </Button>
)}
```

## Also Add Debug Logging

In `loadStartupResponses` function (around line 1087), add console.log statements:

```tsx
const loadStartupResponses = async (mandateId: string, startupId: number) => {
  try {
    console.log('📋 Loading responses for mandate:', mandateId, 'startup:', startupId);
    
    const mandate = reportMandates.find(m => m.id === mandateId);
    if (!mandate) {
      console.log('❌ Mandate not found');
      return;
    }

    const questionIds = mandate.questionIds || [];
    console.log('📝 Question IDs:', questionIds);
    
    // ... rest of code
    
    const { data: responses, error: responseError } = await supabase
      .from('program_tracking_responses')
      .select('question_id, answer_text, created_at')
      .eq('startup_id', startupId)
      .eq('facilitator_id', facilitatorId)
      .in('question_id', questionIds);

    console.log('💬 Responses:', responses);
    console.log('❌ Error:', responseError);
    
    // ... rest of code
  } catch (error) {
    console.error('Failed to load startup responses:', error);
  }
};
```

This will help debug what data is being fetched.
