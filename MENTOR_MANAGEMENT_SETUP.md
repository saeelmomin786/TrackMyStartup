# Mentor Management Setup Guide

## Files Created

### Database
- `CREATE_MENTOR_STARTUP_ASSIGNMENTS.sql` - Run this in Supabase SQL editor

### Frontend Components (in `components/mentor/`)
- `MentorPortfolioModal.tsx` - Portfolio card with stats
- `MentorHistoryModal.tsx` - Meeting history display
- `AssignToStartupForm.tsx` - Assignment form
- `RegisteredMentorsTab.tsx` - Main tab component with Approved/Pending tabs

### Backend Services
- `lib/mentorService.ts` - Updated with new methods

### API Endpoints
- `api/mentor-stats.ts` - Get mentor statistics
- `api/mentor-history.ts` - Get meeting history
- `api/mentor-status.ts` - Update mentor status

## Quick Start

### Step 1: Create Database Tables
Execute `CREATE_MENTOR_STARTUP_ASSIGNMENTS.sql` in your Supabase SQL editor.

This will:
- Create `mentor_startup_assignments` table
- Create `mentor_meeting_history` table
- Set up RLS policies for security
- Create helper functions

### Step 2: Integrate Components

In your Mentor Management page (e.g., `MentorView.tsx`):

```typescript
import RegisteredMentorsTab from '../components/mentor/RegisteredMentorsTab';

// In your component:
<RegisteredMentorsTab />
```

### Step 3: Verify Environment Variables

Make sure these are set in your `.env`:
```
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

### Step 4: Test the Flow

1. Navigate to Mentor Management
2. You should see two tabs: Approved Mentors, Pending Mentors
3. Click "View Portfolio" on any mentor
4. Try the History, Activate/Deactivate, and Assign buttons

## Usage

### For Mentors

1. View their approved status in the table
2. Portfolio card shows their statistics
3. History tab shows all meetings with Google Meet links and AI notes
4. Can view their assignments in the portfolio

### For Facilitators

1. Can manage mentor approvals
2. Can view all meeting history
3. Can assign mentors to startups
4. Can activate/deactivate mentors

### For Startups

1. See assigned mentors in the table
2. Can view mentor portfolio
3. Can see meeting history with their assigned mentors
4. Cannot modify assignments

## Database Operations

### Adding a Meeting Record

```typescript
import { mentorService } from '../lib/mentorService';

await mentorService.addMeetingRecord(
  mentorUserId,
  startupId,
  {
    meetingDate: new Date().toISOString(),
    durationMins: 60,
    googleMeetLink: 'https://meet.google.com/xxx',
    aiNotes: 'Discussed product roadmap',
    topicsDiscussed: ['Product', 'Market'],
    actionItems: 'Send prototype by next week',
    attendanceStatus: 'attended',
    meetingStatus: 'completed'
  }
);
```

### Fetching Mentor Stats

```typescript
const stats = await mentorService.getMentorStats(mentorUserId);
console.log(stats);
// {
//   totalSessions: 5,
//   completedSessions: 4,
//   avgRating: 4.5,
//   totalStartups: 2
// }
```

### Getting Meeting History

```typescript
const history = await mentorService.getMentorHistory(mentorUserId);
history.forEach(meeting => {
  console.log(`${meeting.startup_name}: ${meeting.meeting_date}`);
});
```

## RLS Security

The system implements row-level security:

- **Mentors**: Can only see/modify their own assignments and history
- **Startups**: Can see mentors assigned to them and their meeting history
- **Facilitators**: Can see all assignments and history for their facilitator code
- **Public**: Cannot access any data

## Troubleshooting

### "Permission denied" errors
- Check that RLS policies were created successfully
- Verify auth.uid() is set correctly
- Ensure user has appropriate role

### Missing data in history
- Verify mentor_meeting_history records were inserted
- Check startup IDs match between tables
- Confirm RLS policies allow access

### Assignment fails
- Check that startup exists
- Verify mentor is approved
- Ensure unique constraint is not violated (one assignment per mentor-startup pair)

## Customization

### Changing Status Options
Edit the status constraint in the CREATE TABLE statement:
```sql
status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed'))
```

### Adding Fields to Meeting Records
Add columns to `mentor_meeting_history` table and update the form/modals accordingly.

### Custom Metrics
Add new functions in `mentorService.ts` to calculate additional statistics.

## Monitoring

Monitor these queries for performance:
- Get total sessions per mentor (joins with meeting_history)
- Get active assignments (filtered by status)
- Get meeting statistics (aggregations)

Create indexes if needed:
```sql
CREATE INDEX IF NOT EXISTS idx_mmh_mentor_date ON mentor_meeting_history (mentor_user_id, meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_msa_mentor_startup ON mentor_startup_assignments (mentor_user_id, startup_id);
```

## Support

If issues arise:
1. Check the Supabase dashboard for table status
2. Verify RLS policies in the database
3. Check browser console for API errors
4. Verify environment variables are loaded

## Next Phase Features

Potential future additions:
- Rating system for meetings
- Automated reminders
- Meeting transcripts integration
- Performance analytics dashboard
- Mentor-startup collaboration tools
