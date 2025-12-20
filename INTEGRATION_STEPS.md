# Integration Steps - Mentor-Startup Connection Flow

## ✅ Step 1: SQL Files - COMPLETED
All SQL files have been run successfully in Supabase.

---

## 🔧 Step 2: Integrate Components into MentorView.tsx

### 2.1 Add Imports (Line 20)
Add these imports after the existing imports:

```typescript
import MentorPendingRequestsSection from './mentor/MentorPendingRequestsSection';
import SchedulingModal from './mentor/SchedulingModal';
import ScheduledSessionsSection from './mentor/ScheduledSessionsSection';
```

### 2.2 Add State Variables (After line 81)
Add these state variables:

```typescript
// State for Scheduling Modal
const [schedulingModalOpen, setSchedulingModalOpen] = useState(false);
const [selectedAssignmentForScheduling, setSelectedAssignmentForScheduling] = useState<any>(null);
```

### 2.3 Replace Pending Requests Section (Lines 634-782)
Replace the entire pending requests section with:

```typescript
{/* Pending Requests */}
{mentorMetrics && (
  <MentorPendingRequestsSection
    requests={mentorMetrics.pendingRequests}
    onRequestAction={async () => {
      // Reload mentor metrics
      if (currentUser?.id) {
        const metrics = await mentorService.getMentorMetrics(currentUser.id);
        setMentorMetrics(metrics);
      }
    }}
  />
)}
```

### 2.4 Add Schedule Button to Currently Mentoring Table (Line 917)
Add the Schedule button BEFORE the "Invite to TMS" button:

```typescript
<div className="flex items-center justify-end gap-2">
  {/* Schedule button - only for TMS startups */}
  {assignment.startup && (
    <Button
      size="sm"
      variant="outline"
      className="text-green-600 border-green-300 hover:bg-green-50"
      onClick={() => {
        setSelectedAssignmentForScheduling(assignment);
        setSchedulingModalOpen(true);
      }}
    >
      <Video className="mr-1 h-3 w-3" /> Schedule
    </Button>
  )}
  {/* Only show Invite to TMS if assignment didn't come from a request */}
  {!(assignment as any).fromRequest && (
    // ... existing Invite to TMS button ...
  )}
  // ... rest of buttons ...
</div>
```

### 2.5 Add Modals and Sessions Section (After line 2014, before closing div)
Add before the closing `</div>`:

```typescript
{/* Scheduling Modal */}
{schedulingModalOpen && selectedAssignmentForScheduling && (
  <SchedulingModal
    isOpen={schedulingModalOpen}
    onClose={() => {
      setSchedulingModalOpen(false);
      setSelectedAssignmentForScheduling(null);
    }}
    mentorId={currentUser?.id!}
    startupId={selectedAssignmentForScheduling.startup_id}
    assignmentId={selectedAssignmentForScheduling.id}
    onSessionBooked={async () => {
      // Reload metrics
      if (currentUser?.id) {
        const metrics = await mentorService.getMentorMetrics(currentUser.id);
        setMentorMetrics(metrics);
      }
    }}
  />
)}

{/* Scheduled Sessions Section */}
{mentorStartupsTab === 'active' && currentUser?.id && (
  <div className="mt-6">
    <ScheduledSessionsSection
      mentorId={currentUser.id}
      userType="Mentor"
    />
  </div>
)}
```

---

## 🔧 Step 3: Integrate Components into StartupHealthView.tsx

### 3.1 Add Imports
Add these imports at the top:

```typescript
import ConnectMentorRequestModal from './mentor/ConnectMentorRequestModal';
import StartupRequestsSection from './mentor/StartupRequestsSection';
import ScheduledSessionsSection from './mentor/ScheduledSessionsSection';
```

### 3.2 Add State Variables
Add these state variables:

```typescript
const [connectModalOpen, setConnectModalOpen] = useState(false);
const [selectedMentor, setSelectedMentor] = useState<any>(null);
const [startupRequests, setStartupRequests] = useState<any[]>([]);
```

### 3.3 Add Function to Load Startup Requests
Add this function:

```typescript
const loadStartupRequests = async () => {
  if (!currentStartup?.id || !user?.id) return;
  
  try {
    const { mentorService } = await import('../lib/mentorService');
    const metrics = await mentorService.getMentorMetrics(user.id);
    // Filter requests where this startup is the requester
    const myRequests = metrics.pendingRequests.filter(
      (r: any) => r.startup_id === currentStartup.id && r.requester_id === user.id
    );
    setStartupRequests(myRequests);
  } catch (error) {
    console.error('Error loading startup requests:', error);
  }
};

useEffect(() => {
  if (activeTab === 'services' && servicesSubTab === 'requested') {
    loadStartupRequests();
  }
}, [activeTab, servicesSubTab, currentStartup?.id, user?.id]);
```

### 3.4 Update Services "requested" Sub-tab (Line 413-422)
Replace with:

```typescript
{servicesSubTab === 'requested' && (
  <StartupRequestsSection
    requests={startupRequests}
    onRequestAction={() => {
      loadStartupRequests();
    }}
  />
)}
```

### 3.5 Update Services "my-services" Sub-tab (Line 424-433)
Replace with:

```typescript
{servicesSubTab === 'my-services' && (
  <div className="space-y-4">
    <ScheduledSessionsSection
      startupId={currentStartup.id}
      userType="Startup"
    />
    <div className="text-center py-4 text-slate-600">
      <p className="text-sm">
        Accepted services and ongoing relationships will appear here.
      </p>
    </div>
  </div>
)}
```

### 3.6 Add Connect Modal (At the end, before closing div)
Add before closing:

```typescript
{/* Connect Mentor Request Modal */}
{connectModalOpen && selectedMentor && (
  <ConnectMentorRequestModal
    isOpen={connectModalOpen}
    onClose={() => {
      setConnectModalOpen(false);
      setSelectedMentor(null);
    }}
    mentorId={selectedMentor.id}
    mentorName={selectedMentor.name}
    mentorFeeType={selectedMentor.fee_type}
    mentorFeeAmount={selectedMentor.fee_amount}
    mentorEquityPercentage={selectedMentor.equity_percentage}
    startupId={currentStartup.id}
    requesterId={user?.id!}
    onRequestSent={() => {
      loadStartupRequests();
      setConnectModalOpen(false);
      setSelectedMentor(null);
    }}
  />
)}
```

---

## 📝 Step 4: Create Backend API Endpoints

You'll need to create these API endpoints for Google Calendar integration:

1. `/api/generate-google-meet-link` - Generate Google Meet links
2. `/api/create-google-calendar-event` - Create calendar events
3. `/api/check-google-calendar-conflicts` - Check for conflicts
4. `/api/refresh-google-token` - Refresh OAuth tokens

See `MENTOR_STARTUP_CONNECTION_IMPLEMENTATION_GUIDE.md` for details.

---

## ✅ Step 5: Test the Flow

1. **Startup sends request:**
   - Go to Services → Explore → Find a mentor
   - Click "Connect" → Fill form → Send request

2. **Mentor sees request:**
   - Go to Dashboard → Pending Requests
   - See request with Accept/Reject/Negotiate buttons

3. **Mentor negotiates:**
   - Click "Negotiate" → Enter counter-proposal → Send

4. **Startup accepts negotiation:**
   - Go to Services → Requested
   - See negotiation → Accept or Reject

5. **Schedule session:**
   - Mentor: Go to My Startups → Currently Mentoring → Click "Schedule"
   - Startup: Go to Services → My Services → See scheduled sessions

---

## 🎯 Next Steps After Integration

1. ✅ Integrate components (Steps 2-3 above)
2. ⏳ Create backend API endpoints
3. ⏳ Set up Google OAuth
4. ⏳ Implement email notifications
5. ⏳ Test complete flow

---

## 📚 Files Reference

- Components: `components/mentor/*.tsx`
- Services: `lib/mentorService.ts`, `lib/mentorSchedulingService.ts`, `lib/googleCalendarService.ts`
- SQL: All `*_COMPLETE.sql` files

