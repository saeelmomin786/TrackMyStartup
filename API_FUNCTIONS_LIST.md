# Current API Functions List (12 Total)

## ✅ All Functions Counted

### Root Level API Functions (7):
1. `api/google-calendar.ts` - **Combined Google Calendar endpoint** (handles 4 actions via query param)
2. `api/request-otp.ts` - Request OTP for authentication
3. `api/verify-otp.ts` - Verify OTP code
4. `api/send-invite.ts` - Send invitation emails
5. `api/invite-investor-advisor.ts` - Invite investor/advisor
6. `api/invite-startup-advisor.ts` - Invite startup advisor
7. `api/billing/subscription-status.ts` - Check subscription status

### Razorpay Functions (4):
8. `api/razorpay/create-order.ts` - Create payment order
9. `api/razorpay/create-subscription.ts` - Create subscription
10. `api/razorpay/create-trial-subscription.ts` - Create trial subscription
11. `api/razorpay/verify.ts` - Verify payment

### Invoice Functions (1):
12. `api/invoice/download/[subscriptionId].js` - Download invoice (dynamic route)

---

## 📊 Function Breakdown

| Category | Count | Functions |
|----------|-------|-----------|
| Authentication | 2 | request-otp, verify-otp |
| Invitations | 3 | send-invite, invite-investor-advisor, invite-startup-advisor |
| Google Calendar | 1 | google-calendar (combined - handles 4 actions) |
| Payments (Razorpay) | 4 | create-order, create-subscription, create-trial-subscription, verify |
| Billing | 1 | subscription-status |
| Invoice | 1 | download/[subscriptionId] |
| **TOTAL** | **12** | ✅ Within Vercel Hobby limit |

---

## 🔍 Google Calendar Combined Endpoint

The `api/google-calendar.ts` file handles 4 different actions via query parameter:

1. **Generate Meet Link:** `/api/google-calendar?action=generate-meet-link`
2. **Create Event:** `/api/google-calendar?action=create-event`
3. **Check Conflicts:** `/api/google-calendar?action=check-conflicts`
4. **Refresh Token:** `/api/google-calendar?action=refresh-token`

**This counts as 1 function** but provides 4 different functionalities.

---

## ✅ Status

- **Total Functions:** 12
- **Vercel Hobby Limit:** 12
- **Status:** ✅ **Within limit!**

---

## 📝 Note

If you need to add more functions in the future, you have two options:

1. **Upgrade to Vercel Pro** - Removes the 12 function limit
2. **Combine more endpoints** - Use query parameter routing like we did with Google Calendar

**Current setup is optimal for Hobby plan!** ✅

