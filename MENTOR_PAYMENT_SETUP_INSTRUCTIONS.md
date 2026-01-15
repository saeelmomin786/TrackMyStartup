# Mentor Payment System - Setup Instructions

## ✅ Implementation Complete!

All components have been implemented. Follow these steps to complete the setup:

---

## Step 1: Run Database Migration

**File**: `CREATE_MENTOR_PAYMENT_SYSTEM.sql`

Run this SQL script in your Supabase SQL Editor to create:
- `mentor_payments` table
- Updated `mentor_startup_assignments` table with new statuses and fields
- RLS policies

---

## Step 2: Create Storage Bucket

**File**: `SETUP_STORAGE_BUCKET.sql`

Run this SQL script in Supabase SQL Editor to create the storage bucket for mentor agreements.

**Or manually in Supabase Dashboard:**
1. Go to Storage → Create Bucket
2. Name: `mentor-agreements`
3. Public: **No** (Private)
4. File size limit: 10MB
5. Allowed MIME types: `application/pdf`

---

## Step 3: Update Environment Variables

Ensure these are set in your `.env` file:
```env
VITE_PAYPAL_CLIENT_ID=your_client_id
VITE_PAYPAL_CLIENT_SECRET=your_client_secret
VITE_PAYPAL_ENVIRONMENT=sandbox  # or 'production'
```

---

## Step 4: Configure PayPal Webhook (Production)

1. Go to PayPal Developer Dashboard
2. Navigate to your app → Webhooks
3. Add webhook URL: `https://yourdomain.com/api/paypal/mentor-payment-webhook`
4. Subscribe to events:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `CHECKOUT.ORDER.APPROVED`

---

## Step 5: Test the Flow

### Test Free Mentor:
1. Create mentor with `fee_type = 'Free'`
2. Startup sends request
3. Mentor accepts → Should immediately activate

### Test Fees Mentor:
1. Create mentor with `fee_type = 'Fees'`, set fee amount and currency
2. Startup sends request with proposed fee
3. Mentor accepts → Assignment status = `pending_payment`
4. Startup sees "Pay Now" button
5. Startup pays via PayPal
6. Payment completes → Assignment status = `active`

### Test Stock Options Mentor:
1. Create mentor with `fee_type = 'Stock Options'`, set equity amount and currency
2. Startup sends request with proposed stock options amount
3. Mentor accepts → Assignment status = `pending_agreement`
4. Startup sees "Upload Agreement" button
5. Startup uploads agreement
6. Mentor sees agreement in "Pending Agreement Approvals"
7. Mentor approves → Assignment status = `active`

### Test Hybrid Mentor:
1. Create mentor with `fee_type = 'Hybrid'`, set both fee and equity amounts
2. Startup sends request with both amounts
3. Mentor accepts → Assignment status = `pending_payment_and_agreement`
4. Startup pays AND uploads agreement
5. Mentor approves agreement
6. When both complete → Assignment status = `active`

---

## Files Created/Modified

### New Files:
- `CREATE_MENTOR_PAYMENT_SYSTEM.sql` - Database schema
- `SETUP_STORAGE_BUCKET.sql` - Storage bucket setup
- `components/mentor/MentorPaymentPage.tsx` - Payment page
- `components/mentor/AgreementUploadModal.tsx` - Agreement upload
- `components/mentor/PendingAgreementsSection.tsx` - Agreement approval
- `components/admin/MentorPaymentsTab.tsx` - Admin payment management

### Modified Files:
- `lib/mentorService.ts` - Updated accept flow, added payment/agreement functions
- `components/mentor/StartupRequestsSection.tsx` - Added payment/agreement actions
- `components/MentorView.tsx` - Added agreements section
- `components/AdminView.tsx` - Added mentor payments tab
- `components/PageRouter.tsx` - Added mentor payment route
- `server.js` - Added PayPal webhook handler
- `components/mentor/MentorProfileForm.tsx` - Fixed currency field for Stock Options
- `components/MentorView.tsx` - Fixed currency field for Stock Options

---

## Key Features Implemented

✅ **Multi-Currency Support**: Payments in mentor's preferred currency (EUR/USD/INR/etc.)
✅ **Commission Calculation**: Automatic 20% commission, 80% payout
✅ **Payment Processing**: PayPal integration with webhook support
✅ **Agreement Management**: Upload, view, approve/reject agreements
✅ **Status Tracking**: Real-time status updates across all dashboards
✅ **Admin Management**: Complete payment tracking and transfer management

---

## Next Steps

1. ✅ Run SQL migrations
2. ✅ Create storage bucket
3. ⏳ Test end-to-end flow
4. ⏳ Configure PayPal webhook (production)
5. ⏳ Set up email notifications (optional)

---

**Status**: ✅ All implementation complete! Ready for testing.
