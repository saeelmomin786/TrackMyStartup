# Complete Session Booking Flow & Slot Management

## 📋 Table of Contents
1. [After Startup Books a Slot](#after-startup-books-a-slot)
2. [Slot Visibility After Booking](#slot-visibility-after-booking)
3. [Expired Slot Handling](#expired-slot-handling)
4. [Where Sessions Are Displayed](#where-sessions-are-displayed)
5. [Session Lifecycle](#session-lifecycle)

---

## 🎯 After Startup Books a Slot

### Step-by-Step Flow:

1. **Startup Selects Slot**
   - Startup clicks on an available time slot in the `SchedulingModal`
   - Slot date and time are selected

2. **Booking Process** (`SchedulingModal.tsx` → `handleBookSession`)
   ```
   ┌─────────────────────────────────────┐
   │ 1. Generate Google Meet Link       │
   │    (Optional - continues if fails)  │
   └─────────────────────────────────────┘
              ↓
   ┌─────────────────────────────────────┐
   │ 2. Book Session in Database         │
   │    - Insert into mentor_startup_   │
   │      sessions table                 │
   │    - Status: 'scheduled'            │
   │    - Includes: date, time, duration │
   └─────────────────────────────────────┘
              ↓
   ┌─────────────────────────────────────┐
   │ 3. Create Google Calendar Event     │
   │    (If mentor has calendar sync)    │
   └─────────────────────────────────────┘
              ↓
   ┌─────────────────────────────────────┐
   │ 4. Close Modal & Refresh Data      │
   │    - onSessionBooked() callback     │
   │    - Reloads accepted mentor list   │
   └─────────────────────────────────────┘
   ```

3. **Database Record Created**
   - Table: `mentor_startup_sessions`
   - Fields:
     - `mentor_id`: Mentor's auth user ID
     - `startup_id`: Startup's ID
     - `assignment_id`: Link to mentor-startup assignment
     - `session_date`: Date of session
     - `session_time`: Time of session
     - `duration_minutes`: Session duration
     - `status`: 'scheduled'
     - `google_meet_link`: Google Meet link (if generated)
     - `google_calendar_synced`: Boolean flag

---

## 👁️ Slot Visibility After Booking

### ✅ **Booked Slots Are HIDDEN from Everyone**

**How it works:**

1. **When Fetching Available Slots** (`getAvailableSlotsForDateRange`)
   ```typescript
   // Step 1: Get all booked sessions
   const bookedSessions = await supabase
     .from('mentor_startup_sessions')
     .select('session_date, session_time')
     .eq('mentor_id', mentorId)
     .eq('status', 'scheduled')
     .gte('session_date', startDate)
     .lte('session_date', endDate);

   // Step 2: Create a Set of booked time slots
   const bookedTimes = new Set(
     bookedSessions.map(s => `${s.session_date}T${s.session_time}`)
   );

   // Step 3: Filter out booked slots when generating available slots
   if (!bookedTimes.has(timeKey)) {
     availableSlots.push({ date, time, slotId });
   }
   ```

2. **Result:**
   - ✅ Booked slots are **NOT shown** in the scheduling modal
   - ✅ Other startups **CANNOT** see or book the same slot
   - ✅ Mentor **CANNOT** see the slot as available anymore
   - ✅ Only **unbooked slots** are displayed

3. **Conflict Prevention:**
   - The system prevents double-booking by checking booked sessions
   - Each slot can only be booked once
   - Once booked, it's immediately removed from available slots

---

## ⏰ Expired Slot Handling

### Automatic Cleanup Functions

#### 1. **Past Scheduled Sessions** (Never Completed)
```typescript
cleanupPastScheduledSessions()
```
- **When:** Called automatically before fetching slots
- **What:** Deletes scheduled sessions older than **7 days** that were never completed
- **Why:** Clean up sessions that passed without being marked as completed
- **Status:** `status = 'scheduled'` AND `session_date < 7 days ago`

**Example:**
- Session scheduled for Dec 1, 2025
- Today is Dec 10, 2025 (9 days later)
- Session still has status 'scheduled'
- → **Deleted automatically**

#### 2. **Old Completed Sessions**
```typescript
cleanupOldSessions()
```
- **When:** Called automatically before fetching sessions
- **What:** Deletes completed sessions older than **30 days**
- **Why:** Keep database clean, only keep recent history
- **Status:** `status = 'completed'` AND `session_date < 30 days ago`

**Example:**
- Session completed on Nov 1, 2025
- Today is Dec 5, 2025 (34 days later)
- → **Deleted automatically**

### Cleanup Triggers

These cleanup functions are called:
- ✅ Before fetching available slots (`getAvailableSlotsForDateRange`)
- ✅ Before fetching mentor sessions (`getMentorSessions`)
- ✅ Automatically in the background

---

## 📍 Where Sessions Are Displayed

### For Mentors:

#### 1. **Mentor Dashboard → Schedule Tab → Upcoming Sessions**
   - Component: `ScheduledSessionsSection`
   - Shows: All scheduled sessions for the mentor
   - Displays:
     - Session date and time
     - Startup name
     - Duration
     - Google Meet link
     - Status
   - Actions:
     - View session details
     - Cancel session
     - Mark as completed

#### 2. **Mentor Dashboard → Schedule Tab → Past Sessions**
   - Component: `PastSessionsSection`
   - Shows: Completed and past sessions
   - Displays:
     - Session date and time
     - Startup name
     - Feedback (if provided)
     - Completion status

### For Startups:

#### **Startup Dashboard → My Services Tab**
   - Component: `ScheduledSessionsSection`
   - Shows: All scheduled sessions for the startup
   - Displays:
     - Session date and time
     - Mentor name
     - Duration
     - Google Meet link
     - Status
   - Actions:
     - View session details
     - Cancel session
     - Join meeting (via Google Meet link)

---

## 🔄 Session Lifecycle

```
┌─────────────────┐
│   SCHEDULED     │ ← Startup books slot
│                 │
│ Status:         │
│ 'scheduled'     │
└────────┬────────┘
         │
         │ (Session happens)
         ↓
┌─────────────────┐
│   COMPLETED     │ ← Mentor marks as completed
│                 │
│ Status:         │
│ 'completed'     │
│                 │
│ (Optional)      │
│ Feedback added  │
└────────┬────────┘
         │
         │ (30 days pass)
         ↓
┌─────────────────┐
│    DELETED      │ ← Auto-cleanup
│                 │
│ (Removed from   │
│  database)      │
└─────────────────┘
```

### Alternative Paths:

```
SCHEDULED → CANCELLED → (Deleted after 7 days if past)
SCHEDULED → RESCHEDULED → SCHEDULED (new date/time)
SCHEDULED → NO_SHOW → (Mentor marks as no-show)
```

---

## 🔒 Security & Data Integrity

### RLS Policies:

1. **Mentors can:**
   - View their own sessions
   - Create sessions (for their assignments)
   - Update their own sessions
   - Delete their own sessions

2. **Startups can:**
   - View their own sessions
   - Create sessions (book slots with assigned mentors)
   - Update their own sessions (cancel)
   - Cannot delete sessions

3. **Slot Booking Validation:**
   - ✅ Must have active mentor-startup assignment
   - ✅ Slot must be available (not already booked)
   - ✅ Slot must be within mentor's availability
   - ✅ Date must be in the future

---

## 📊 Summary

| Aspect | Details |
|--------|---------|
| **After Booking** | Session created, Google Meet link generated, Calendar event created |
| **Slot Visibility** | Booked slots are **HIDDEN** from everyone (filtered out) |
| **Expired Slots** | Auto-deleted: Scheduled >7 days old, Completed >30 days old |
| **Display Location** | Mentor: Schedule tab | Startup: My Services tab |
| **Session Status** | scheduled → completed/cancelled → deleted |

---

## 🎯 Key Points

1. ✅ **Booked slots are immediately hidden** - No one can see or book them
2. ✅ **Automatic cleanup** - Expired sessions are removed automatically
3. ✅ **Both sides see sessions** - Mentor and Startup can view their sessions
4. ✅ **Conflict prevention** - System prevents double-booking
5. ✅ **Clean database** - Old sessions are automatically cleaned up



