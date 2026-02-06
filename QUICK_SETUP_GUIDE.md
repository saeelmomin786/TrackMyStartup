# Quick Setup Guide - Track My Startup Questions Feature

## Step 1: Run Database Migrations

Execute these SQL files in your Supabase SQL Editor in this order:

### 1. CREATE_TRACK_MY_STARTUP_QUESTIONS_TABLE.sql
```bash
# This creates the table to store program questions
```

### 2. CREATE_PROGRAM_TRACKING_RESPONSES_TABLE.sql
```bash
# This creates the table to store startup responses
```

## Step 2: Verify Tables Created

Run this query to verify:
```sql
SELECT tablename 
FROM pg_tables 
WHERE tablename IN ('incubation_program_questions', 'program_tracking_responses');
```

You should see both tables listed.

## Step 3: Test the Feature

### As a Facilitator:

1. **Login as facilitator**
2. **Go to Track My Startups tab**
3. **Select a specific program** (not "All" or "Others")
4. **Click "Configure Questions" button** (appears next to Portfolio/Reports)
5. **In the modal:**
   - Browse available questions from the question bank
   - Select questions you want to ask startups
   - Mark questions as required/optional
   - Click "Save Questions"

### As a Startup (Coming Next):

The startup response UI is ready to be implemented using:
- `questionBankService.getProgramTrackingQuestions()` - Get questions
- `questionBankService.saveProgramTrackingResponse()` - Save answers
- `questionBankService.getProgramTrackingResponses()` - Load existing answers

## Features Included

✅ Configure questions per program
✅ Use existing question bank (same as Form 2)
✅ Mark questions as required/optional
✅ Save/load configuration
✅ RLS policies for security
✅ Database tables and indexes
✅ Service methods for CRUD operations

## Features To Implement Next

⏳ Startup response form UI
⏳ Facilitator view all responses
⏳ Export responses to CSV
⏳ Response analytics
⏳ Notifications for new questions

## Code Changes Summary

### Files Modified:
1. **FacilitatorView.tsx**
   - Added state variables for program questions config
   - Added `openProgramQuestionsConfig()` function
   - Added "Configure Questions" button
   - Added configuration modal

2. **questionBankService.ts**
   - Added `getProgramTrackingQuestions()`
   - Added `addQuestionsToProgram()`
   - Added `removeProgramQuestions()`
   - Added `updateProgramQuestionOrder()`
   - Added `updateProgramQuestionRequired()`
   - Added `saveProgramTrackingResponse()`
   - Added `getProgramTrackingResponses()`
   - Added `getAllProgramTrackingResponses()`

### Files Created:
1. **CREATE_TRACK_MY_STARTUP_QUESTIONS_TABLE.sql**
2. **CREATE_PROGRAM_TRACKING_RESPONSES_TABLE.sql**
3. **TRACK_MY_STARTUP_QUESTIONS_FEATURE_SUMMARY.md**
4. **QUICK_SETUP_GUIDE.md** (this file)

## Troubleshooting

### Button not showing?
- Make sure you selected a specific program (not "All" or "Others")
- Make sure you're in the "My Portfolio" tab (not "Reports")

### Modal not opening?
- Check browser console for errors
- Verify user is authenticated
- Check that program name is valid

### Questions not saving?
- Verify database tables were created
- Check RLS policies are active
- Check browser console for errors
- Verify user has facilitator permissions

### Need to reset configuration?
```sql
-- Remove all questions for a program
DELETE FROM incubation_program_questions 
WHERE facilitator_id = 'YOUR_FACILITATOR_ID' 
AND program_name = 'YOUR_PROGRAM_NAME';
```

## Support

If you encounter issues:
1. Check browser console for JavaScript errors
2. Check Supabase logs for database errors
3. Verify RLS policies are enabled
4. Check user authentication status
5. Refer to TRACK_MY_STARTUP_QUESTIONS_FEATURE_SUMMARY.md for detailed documentation
