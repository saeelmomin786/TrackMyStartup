# Events Public Flow API Quickstart

## Prerequisite
Run this SQL first in Supabase:
- `CREATE_PUBLIC_EVENTS_REGISTRATION_SYSTEM.sql`

## Implemented APIs

### 1) Initialize Registration
- `POST /api/events/register-init`
- Purpose: Create registration + save dynamic form answers.

Request body:
```json
{
  "eventSlug": "founders-masterclass-2026",
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+91-9000000000",
  "companyName": "Acme Labs",
  "designation": "Founder",
  "answers": [
    {
      "questionId": "<uuid>",
      "answerText": "My short answer"
    },
    {
      "questionId": "<uuid>",
      "answerJson": ["Option A", "Option C"]
    }
  ]
}
```

Response highlights:
- `registrationId`
- `paymentRequired`
- `amountDue`
- `currency`

### 2) Create Razorpay Order
- `POST /api/events/create-order`
- Purpose: Create payment order for a registration.

Request body:
```json
{
  "registrationId": "<uuid>"
}
```

Response highlights:
- `order` (Razorpay order object)
- `keyId` (public key for checkout)

### 3) Verify Payment + Confirm Registration
- `POST /api/events/verify-payment`
- Purpose: Verify Razorpay signature and mark registration paid/confirmed.

Request body:
```json
{
  "registrationId": "<uuid>",
  "razorpay_order_id": "order_...",
  "razorpay_payment_id": "pay_...",
  "razorpay_signature": "..."
}
```

Behavior:
- Calls DB RPC `confirm_event_payment(...)`
- Marks registration `payment_status = paid`, `status = confirmed`
- Sends confirmation email with payment receipt and Meet link (if configured)
- Stores email logs in `event_email_logs`

### 4) Razorpay Webhook (Server-to-Server)
- `POST /api/events/webhook`
- Purpose: Server-side payment confirmation fallback/idempotency.
- Required header: `x-razorpay-signature`
- Required env: `RAZORPAY_WEBHOOK_SECRET`

## Required Environment Variables
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RAZORPAY_KEY_ID` (or `VITE_RAZORPAY_KEY_ID`)
- `RAZORPAY_KEY_SECRET` (or `VITE_RAZORPAY_KEY_SECRET`)
- `RAZORPAY_WEBHOOK_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM` (optional, fallback to `SMTP_USER`)
- `SMTP_FROM_NAME` (optional)

## Implemented Frontend Routes
- Admin dashboard tab: `Events` (create/publish events and form questions)
- Public detail page: `/events/:slug`
- Public registration page: `/events/:slug/register`

## Important Security Notes
- Amount is always read from DB (`event_registrations.amount_due`), not from frontend.
- Payment is confirmed only after server-side signature verification.
- Next production hardening step: add `webhook` endpoint with signature verification and idempotent replay handling.

## Next Build Steps
1. Configure Razorpay webhook URL to point to `/api/events/webhook`.
2. Add a dedicated event list card feed from DB in `EventsPage`.
3. Add admin registrations table view/export in `AdminEventsTab`.
4. Add anti-bot (captcha/rate limit) to `/api/events/register-init`.
