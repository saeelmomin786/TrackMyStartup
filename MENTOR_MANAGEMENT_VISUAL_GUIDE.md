# Mentor Management System - Visual Overview

## User Interface Flow

```
┌─────────────────────────────────────────────────┐
│         Mentor Management Dashboard              │
├─────────────────────────────────────────────────┤
│  [Approved Mentors (12)]  [Pending Mentors (3)]  │
└─────────────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   Registered Mentors Table     │
        ├───────────────────────────────┤
        │ Name │ Email │ Expertise │ ... │
        ├───────────────────────────────┤
        │ John │ john@ │ Tech, Growth  │ │
        │ Jane │ jane@ │ Finance, HR    │ │
        │ Mike │ mike@ │ Marketing      │ │
        └───────────────────────────────┘
                        │
                        ▼ (Click View Portfolio)
        ┌─────────────────────────────────┐
        │   Portfolio Card Modal           │
        ├─────────────────────────────────┤
        │  [Photo] John Doe                │
        │  john@example.com                │
        │  Tags: Tech, Growth              │
        │                                  │
        │  ┌─ STATISTICS ─────────────┐  │
        │  │ 15    │  12    │ 4.5 │ 3 │  │
        │  │Sessions Completed Rating│ │ │
        │  └──────────────────────────┘  │
        │                                  │
        │ [Deactivate] [View History] [+ Assign]
        └─────────────────────────────────┘
              │              │           │
              │              │           ▼
              │              │    ┌──────────────────┐
              │              │    │ Assignment Form  │
              │              │    ├──────────────────┤
              │              │    │ Select Startup:  │
              │              │    │ [Dropdown ▼]     │
              │              │    │                  │
              │              │    │ Notes (Optional) │
              │              │    │ [Text Area]      │
              │              │    │                  │
              │              │    │ [Cancel][Assign] │
              │              │    └──────────────────┘
              │              │
              │              ▼
              │     ┌──────────────────────────┐
              │     │ Meeting History Modal    │
              │     ├──────────────────────────┤
              │     │ John Doe - History       │
              │     ├──────────────────────────┤
              │     │ Startup XYZ              │
              │     │ Dec 15, 2024 - 10:00 AM │
              │     │ ✓ Completed  | Attended │
              │     │                          │
              │     │ Duration: 60 minutes     │
              │     │ Topics: [Product][Sales]│
              │     │                          │
              │     │ Meeting: https://meet... │
              │     │           [Copy]         │
              │     │                          │
              │     │ AI Notes:                │
              │     │ Discussed roadmap...     │
              │     │                          │
              │     │ Action Items:            │
              │     │ Send prototype by...     │
              │     │                          │
              │     │ [Earlier Meeting]        │
              │     │ ...                      │
              │     │                          │
              │     │ [Close]                  │
              │     └──────────────────────────┘
              │
              ▼ (Deactivate)
        Status updated to: INACTIVE
```

## Database Schema

```
┌──────────────────────────────────┐
│     mentor_startup_assignments   │
├──────────────────────────────────┤
│ id (PK)                          │
│ mentor_user_id (FK → auth.users) │
│ startup_id (FK → startups)       │
│ facilitator_code                 │
│ status (active/inactive/...)     │
│ assigned_at                      │
│ assigned_by                      │
│ notes                            │
│ created_at, updated_at           │
└──────────────────────────────────┘
            │
            │ references
            ▼
┌───────────────────────────────────────┐
│   mentor_meeting_history              │
├───────────────────────────────────────┤
│ id (PK)                               │
│ mentor_startup_assignment_id (FK)     │
│ mentor_user_id (FK → auth.users)      │
│ startup_id (FK → startups)            │
│ meeting_date                          │
│ meeting_duration_mins                 │
│ google_meet_link ← [KEY FIELD]        │
│ ai_notes ← [KEY FIELD]                │
│ topics_discussed (array)              │
│ action_items                          │
│ attendance_status                     │
│ recording_url                         │
│ meeting_status                        │
│ created_at, updated_at                │
└───────────────────────────────────────┘
```

## Data Flow

```
┌─────────────┐
│   Mentor    │
│  (User)     │
└──────┬──────┘
       │
       ├─→ [Get Profile] → user_profiles
       │
       └─→ [Get Assignments] 
           ↓
       ┌─────────────────────────────────┐
       │ mentor_startup_assignments      │
       │ - Active assignments            │
       │ - Status tracking               │
       │ - Assignment history            │
       └──────────┬──────────────────────┘
                  │
                  ├─→ [Get Stats]
                  │   (COUNT queries)
                  │
                  └─→ [Get Meeting History]
                      ↓
                  ┌──────────────────────┐
                  │ mentor_meeting_history│
                  │ - All meetings        │
                  │ - Google Meet links   │
                  │ - AI notes            │
                  │ - Topics              │
                  │ - Action items        │
                  └──────────────────────┘
```

## Component Hierarchy

```
┌─ RegisteredMentorsTab (Main Container)
│
├─ [Tabs]
│  ├─ Approved Tab
│  └─ Pending Tab
│
├─ [Table Display]
│  ├─ Row 1
│  ├─ Row 2
│  └─ ...
│
├─ MentorPortfolioModal (Overlay)
│  ├─ Mentor Header
│  ├─ Statistics Box
│  ├─ Action Buttons
│  │  ├─ Active/Deactivate
│  │  ├─ View History
│  │  └─ Assign
│  └─ Close Button
│
├─ MentorHistoryModal (Overlay)
│  ├─ Header
│  ├─ Meeting List
│  │  ├─ Meeting Card 1
│  │  │  ├─ Status Badges
│  │  │  ├─ Google Meet Link
│  │  │  ├─ AI Notes
│  │  │  └─ Action Items
│  │  ├─ Meeting Card 2
│  │  └─ ...
│  └─ Close Button
│
└─ AssignToStartupForm (Overlay)
   ├─ Mentor Info
   ├─ Form Fields
   │  ├─ Startup Selector
   │  └─ Notes Field
   ├─ Buttons
   │  ├─ Cancel
   │  └─ Assign
   └─ Messages
      ├─ Error
      └─ Success
```

## API Endpoint Flow

```
Frontend Request
       │
       ▼
┌──────────────────┐
│ GET /api/mentor-stats
│ ?mentorId={id}
└──────┬───────────┘
       │
       ▼
Supabase Query
[SELECT from mentor_meeting_history]
[SELECT from mentor_startup_assignments]
       │
       ▼
┌──────────────────────┐
│ Response:            │
│ {                    │
│   totalSessions: 15  │
│   completedSessions: 12
│   avgRating: 4.5     │
│   totalStartups: 3   │
│ }                    │
└──────────────────────┘
       │
       ▼
Frontend Display
[Statistics Box Updated]
```

## Security & RLS

```
┌─ Row Level Security (RLS) Policies
│
├─ mentor_startup_assignments
│  ├─ Mentors: Can view/update own records only
│  ├─ Startups: Can view mentors assigned to them
│  ├─ Facilitators: Can manage all with their code
│  └─ Others: No access
│
└─ mentor_meeting_history
   ├─ Mentors: Can view/insert own records only
   ├─ Startups: Can view meetings with their mentors
   ├─ Facilitators: Can view all for their code
   └─ Others: No access
```

## State Management

```
RegisteredMentorsTab
├─ State: activeTab (approved | pending)
├─ State: mentors[] (list of mentors)
├─ State: loading (boolean)
├─ State: selectedMentor (current mentor)
├─ State: showPortfolioModal (boolean)
├─ State: showHistoryModal (boolean)
├─ State: showAssignForm (boolean)
│
├─ Effects:
│  └─ [activeTab] → fetchMentors()
│
└─ Handlers:
   ├─ handleViewPortfolio()
   ├─ handleViewHistory()
   ├─ handleAssignMentor()
   └─ fetchMentors()
```

## Timeline of Features

### Phase 1: Foundation ✓
- Database tables created
- RLS policies implemented
- Backend services

### Phase 2: UI Components ✓
- Tab interface
- Portfolio modal
- History display
- Assignment form

### Phase 3: Integration ✓
- API endpoints
- Service layer
- Frontend integration

### Phase 4: Enhancements (Future)
- Rating system
- Analytics dashboard
- Meeting reminders
- Performance insights
- Transcription integration
