# Startup Dashboard - Scheduling Flow

## 📍 Where Shared Slots Appear

### **Location in Startup Dashboard:**

```
Startup Dashboard
  ↓
Services Tab
  ↓
My Services Sub-tab
  ↓
Accepted Mentor Connections Table
  ↓
[Schedule] Button (next to each mentor)
```

---

## 🎯 Complete Flow

### **Step 1: Mentor Shares Slots**
```
Mentor Dashboard → Dashboard Tab → Currently Mentoring
   ↓
Mentor clicks: "Share Slots" button
   ↓
ShareSlotsModal opens
   ↓
Mentor confirms: Slots are shared
```

### **Step 2: Startup Sees Shared Slots**
```
Startup Dashboard → Services Tab → My Services
   ↓
Startup sees: "Accepted Mentor Connections" table
   ↓
Table shows:
├─ Mentor Name
├─ Accepted Date
├─ Status: "Accepted"
└─ [Schedule] Button
```

### **Step 3: Startup Clicks "Schedule"**
```
Startup clicks: "Schedule" button next to mentor
   ↓
SchedulingModal opens
   ↓
System automatically:
├─ Fetches mentor's availability slots
├─ Fetches already booked sessions
├─ Filters out conflicts
└─ Shows available slots
```

### **Step 4: Startup Selects & Books**
```
Startup sees:
├─ Date picker (next 30 days)
├─ Duration selector (30/60/90/120 minutes)
└─ Available time slots for selected date
   ↓
Startup selects:
├─ Date: Dec 16, 2024
├─ Time: 2:00 PM
└─ Duration: 60 minutes
   ↓
Startup clicks: "Book Session"
   ↓
Session created in database
```

---

## 📋 Detailed UI Flow

### **1. Startup Dashboard - Services Tab**

```
┌─────────────────────────────────────────┐
│  Services Tab                           │
├─────────────────────────────────────────┤
│  [Explore] [Requested] [My Services]   │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ My Services                       │ │
│  ├───────────────────────────────────┤ │
│  │ Accepted Mentor Connections       │ │
│  │                                    │ │
│  │ ┌──────────────────────────────┐  │ │
│  │ │ Mentor | Date | Status | Act│  │ │
│  │ ├──────────────────────────────┤  │ │
│  │ │ John Doe | 12/10/24 | Accept│  │ │
│  │ │          |        | ed | [Sc│  │ │
│  │ │          |        |    | hedule]│ │
│  │ └──────────────────────────────┘  │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### **2. Startup Clicks "Schedule" Button**

```
┌─────────────────────────────────────────┐
│  Schedule Session                       │
├─────────────────────────────────────────┤
│  Duration: [60 minutes ▼]              │
│                                         │
│  Select Date: [📅 Dec 16, 2024]       │
│                                         │
│  Available Times:                       │
│  [2:00 PM] [2:30 PM] [3:00 PM]         │
│  [3:30 PM]                              │
│                                         │
│  Selected:                              │
│  📅 Dec 16, 2024 (Monday)              │
│  🕐 2:00 PM (60 minutes)                │
│  🎥 Google Meet link will be         │
│     generated after booking              │
│                                         │
│  [Cancel]  [Book Session]              │
└─────────────────────────────────────────┘
```

---

## 🔍 Code Implementation

### **Location: `components/StartupHealthView.tsx`**

**Line 649-714:** My Services Tab Content

```tsx
{servicesSubTab === 'my-services' && (
  <div className="space-y-4">
    {/* Accepted Mentor Connections */}
    {acceptedMentorRequests.length > 0 && (
      <Card>
        <h3>Accepted Mentor Connections</h3>
        <table>
          <thead>
            <tr>
              <th>Mentor</th>
              <th>Accepted Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {acceptedMentorRequests.map((request) => (
              <tr>
                <td>{request.mentor_name}</td>
                <td>{formatDateDDMMYYYY(request.responded_at)}</td>
                <td>Accepted</td>
                <td>
                  <Button
                    onClick={() => {
                      setSelectedMentorForScheduling(request);
                      setSchedulingModalOpen(true);
                    }}
                  >
                    <Video /> Schedule
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    )}
  </div>
)}
```

**Line 680-692:** Schedule Button Implementation

```tsx
<Button
  size="sm"
  variant="outline"
  className="text-green-600 border-green-300 hover:bg-green-50"
  onClick={() => {
    setSelectedMentorForScheduling(request);
    setSchedulingModalOpen(true);
  }}
>
  <Video className="mr-1 h-3 w-3" /> Schedule
</Button>
```

**Line 896-915:** SchedulingModal Integration

```tsx
{schedulingModalOpen && selectedMentorForScheduling && currentStartup?.id && (
  <SchedulingModal
    isOpen={schedulingModalOpen}
    onClose={() => {
      setSchedulingModalOpen(false);
      setSelectedMentorForScheduling(null);
    }}
    mentorId={selectedMentorForScheduling.mentor_id}
    startupId={currentStartup.id}
    assignmentId={selectedMentorForScheduling.assignment_id}
    onSessionBooked={async () => {
      await loadAcceptedMentorRequests();
    }}
  />
)}
```

---

## ✅ How It Works

### **1. Data Loading**

When startup opens "My Services" tab:
- System fetches `acceptedMentorRequests` from `mentor_requests` table
- Filters by: `status = 'accepted'` and `startup_id = current startup`
- Enriches with mentor name from `mentor_profiles` or `user_profiles`
- Fetches `assignment_id` from `mentor_startup_assignments`

### **2. Schedule Button Click**

When startup clicks "Schedule":
- Sets `selectedMentorForScheduling` = the mentor request object
- Sets `schedulingModalOpen` = true
- Opens `SchedulingModal` component

### **3. Modal Loads Slots**

When `SchedulingModal` opens:
- Calls `loadAvailableSlots()` function
- Fetches slots using `mentorSchedulingService.getAvailableSlotsForDateRange()`
- Passes: `mentorId`, `startDate` (tomorrow), `endDate` (30 days ahead)
- System automatically:
  - Gets mentor's availability slots
  - Gets already booked sessions
  - Filters out conflicts
  - Returns available slots

### **4. Startup Books Session**

When startup selects and books:
- Validates date and time are selected
- Generates Google Meet link
- Calls `mentorSchedulingService.bookSession()`
- Creates session in `mentor_startup_sessions` table
- Creates Google Calendar event (if enabled)
- Closes modal
- Reloads accepted mentor requests

---

## 🎯 Key Points

### **✅ Slots Are Automatically Available**
- When mentor creates slots in "Manage Availability", they're automatically available
- When mentor clicks "Share Slots", it's just a confirmation
- Startup can see and book from these slots immediately

### **✅ No Additional Setup Needed**
- Slots don't need to be "shared" explicitly in the database
- The `getAvailableSlotsForDateRange()` function automatically fetches all active slots
- Conflict prevention is built-in

### **✅ Real-Time Availability**
- When one startup books a slot, it's immediately filtered out for others
- No double-booking possible
- Updates happen in real-time

---

## 📊 Visual Flow Diagram

```
┌─────────────────────────────────────────┐
│  MENTOR SHARES SLOTS                    │
├─────────────────────────────────────────┤
│  Mentor Dashboard                       │
│  → Currently Mentoring                  │
│  → [Share Slots] Button                 │
│  → ShareSlotsModal                      │
│  → Confirms sharing                     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  STARTUP SEES IN DASHBOARD              │
├─────────────────────────────────────────┤
│  Startup Dashboard                      │
│  → Services Tab                         │
│  → My Services Sub-tab                  │
│  → Accepted Mentor Connections Table    │
│  → [Schedule] Button                    │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  STARTUP CLICKS SCHEDULE                │
├─────────────────────────────────────────┤
│  SchedulingModal Opens                  │
│  → Fetches mentor's slots               │
│  → Shows available dates & times         │
│  → Startup selects date & time          │
│  → Startup books session                │
└─────────────────────────────────────────┘
```

---

## 🎉 Summary

**Where it appears:**
- ✅ Startup Dashboard → Services Tab → My Services → Accepted Mentor Connections Table → [Schedule] Button

**What happens:**
1. ✅ Mentor shares slots (confirmation)
2. ✅ Startup sees mentor in "My Services" tab
3. ✅ Startup clicks "Schedule" button
4. ✅ Modal shows all mentor's available slots
5. ✅ Startup selects date & time
6. ✅ Startup books session
7. ✅ Session created, Google Meet link generated

**The flow is fully implemented and working!** 🚀



