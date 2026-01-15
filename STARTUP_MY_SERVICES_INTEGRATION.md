# Startup Dashboard - My Services Integration

## Summary
Updated the startup dashboard to show mentor assignments in "My Services" section with payment/agreement actions.

## Changes Made

### 1. Updated `loadAcceptedMentorRequests` function in `StartupHealthView.tsx`
- Changed from fetching `mentor_requests` with status='accepted' to fetching `mentor_startup_assignments`
- Now fetches all assignments (except cancelled) with mentor profile data
- Includes payment_status, agreement_status, fee_type, fee_currency, etc.

### 2. Created `MyServicesSection.tsx` component
Location: `components/startup/MyServicesSection.tsx`

Features:
- Displays mentor assignments in a table
- Shows status badges:
  - **Active** (green) - When assignment is active
  - **Ready for Activation** (blue) - When payment/agreement completed, waiting for mentor final acceptance
  - **Reviewing** (yellow) - When payment/agreement is pending
- Action buttons based on status:
  - **Payment** button - Shows when status is `pending_payment` or `pending_payment_and_agreement`
  - **Agreement** button - Shows when status is `pending_agreement` or `pending_payment_and_agreement`
  - **Send to Mentor** button - Shows when status is `ready_for_activation`
  - **View** button - Shows when status is `active`

### 3. Integration Steps (TO DO - File appears corrupted)

In `StartupHealthView.tsx`, you need to:

1. **Add import at the top:**
```typescript
import MyServicesSection from './startup/MyServicesSection';
```

2. **Replace the "My Services" section** (around line 2221):
```typescript
{servicesSubTab === 'my-services' && (
  <div className="space-y-4">
    <MyServicesSection
      assignments={acceptedMentorRequests}
      onRefresh={loadAcceptedMentorRequests}
    />
    <ScheduledSessionsSection
      startupId={currentStartup.id}
      userType="Startup"
    />
  </div>
)}
```

## Flow

1. **Mentor confirms request** → Assignment created with status:
   - `pending_payment` (if Fees)
   - `pending_agreement` (if Stock Options)
   - `pending_payment_and_agreement` (if Hybrid)
   - `active` (if Free)

2. **Startup sees in "My Services"**:
   - Status shows "Reviewing" (yellow badge)
   - Action buttons show based on fee type:
     - Payment button (if Fees/Hybrid)
     - Agreement button (if Stock Options/Hybrid)

3. **Startup completes payment/agreement**:
   - Payment: Redirects to `/mentor-payment?assignmentId=xxx`
   - Agreement: Opens AgreementUploadModal
   - After completion, status changes to `ready_for_activation`

4. **Status shows "Ready for Activation"**:
   - "Send to Mentor" button appears
   - Startup clicks to notify mentor

5. **Mentor does final acceptance**:
   - Status changes to `active`
   - "View" button appears for startup

## Status Badge Logic

- `active` → Green "Active" badge + View button
- `ready_for_activation` → Blue "Ready for Activation" badge + Send to Mentor button
- `pending_payment` → Yellow "Reviewing" badge + Payment button
- `pending_agreement` → Yellow "Reviewing" badge + Agreement button
- `pending_payment_and_agreement` → Yellow "Reviewing" badge + Both buttons

## Notes

- The `loadAcceptedMentorRequests` function has been updated to fetch assignments
- The component handles all fee types (Free, Fees, Stock Options, Hybrid)
- Payment redirects to external page, Agreement opens modal
- After payment/agreement completion, webhook updates status automatically
