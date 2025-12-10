# Mentor Equity Allocation Approval Flow

## Overview
When a startup adds a mentor in the Equity Allocation tab, it creates a mentor request that requires mentor approval before the startup appears in the mentor's "Currently Mentoring" section.

## Flow Diagram

```
1. Startup adds Mentor in Equity Allocation Tab
   ↓
2. System creates:
   - mentor_equity_records entry (with status='pending')
   - mentor_requests entry (with status='pending')
   ↓
3. Mentor receives notification/request in MentorView
   ↓
4. Mentor can Accept or Reject:
   
   ACCEPT:
   - Updates mentor_requests.status = 'accepted'
   - Creates mentor_startup_assignments entry (status='active')
   - Startup appears in "Currently Mentoring" section
   
   REJECT:
   - Updates mentor_requests.status = 'rejected'
   - No assignment created
```

## Database Schema

### mentor_equity_records
- Stores equity allocation details
- Links to mentor_requests via `request_id`
- Status: 'pending', 'approved', 'rejected'

### mentor_requests
- Tracks requests from startups to mentors
- Status: 'pending', 'accepted', 'rejected', 'cancelled'
- Links to mentor_equity_records via request_id

### mentor_startup_assignments
- Created when mentor accepts request
- Shows in "Currently Mentoring" section
- Status: 'active', 'completed', 'cancelled'

## Implementation Details

### 1. When Startup Adds Mentor
**File**: `components/startup-health/CapTableTab.tsx`
- Calls `mentorEquityService.createMentorRecord()`
- Passes current user ID as `requesterId`

### 2. Creating Mentor Record & Request
**File**: `lib/mentorEquityService.ts`
- Finds mentor user by mentor_code
- Creates mentor_requests entry
- Creates mentor_equity_records entry with request_id

### 3. Mentor Approval/Rejection
**File**: `lib/mentorService.ts`
- `acceptMentorRequest()`: Updates request status and creates assignment
- `rejectMentorRequest()`: Updates request status to rejected

### 4. UI Integration
**File**: `components/MentorView.tsx`
- Shows pending requests in "Mentor Requests" section
- Accept/Reject buttons wired to service functions
- Auto-refreshes metrics after action

## SQL Migrations

### For New Installations
Run: `CREATE_MENTOR_EQUITY_RECORDS_TABLE.sql`
- Includes `request_id` column from the start

### For Existing Installations
Run: `ADD_MENTOR_REQUEST_LINK_TO_EQUITY_RECORDS.sql`
- Adds `request_id` column to existing table

## Key Features

✅ **Automatic Request Creation**: When startup adds mentor, request is automatically created
✅ **Mentor Approval Required**: Mentor must approve before assignment is created
✅ **Linked Records**: Equity records linked to requests via request_id
✅ **Assignment Creation**: On approval, creates mentor_startup_assignments entry
✅ **Status Tracking**: Both equity records and requests have status fields

## Status Flow

### mentor_equity_records.status
- `pending`: Initial state when created
- `approved`: When mentor accepts (can be updated manually)
- `rejected`: When mentor rejects (can be updated manually)

### mentor_requests.status
- `pending`: Initial state, waiting for mentor response
- `accepted`: Mentor approved, assignment created
- `rejected`: Mentor rejected
- `cancelled`: Request cancelled by startup

### mentor_startup_assignments.status
- `active`: Currently mentoring (shown in "Currently Mentoring")
- `completed`: Mentoring relationship ended
- `cancelled`: Assignment cancelled

## Notes

- If mentor code is invalid or mentor user not found, equity record is still created but no request is created
- If request creation fails, equity record is still created (graceful degradation)
- Assignment creation uses upsert to handle duplicates gracefully
- Fee and ESOP details from equity record are copied to assignment














