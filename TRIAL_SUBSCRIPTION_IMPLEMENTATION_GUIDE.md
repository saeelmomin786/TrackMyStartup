# 7-Day Trial Subscription Implementation Guide

This guide explains how to implement the 7-day trial subscription system for startup users with automatic charging after the trial period.

## Overview

The trial subscription system allows startup users to:
1. Start a 7-day free trial with full access to all features
2. Automatically convert to paid subscription after trial ends
3. Track trial progress and receive notifications
4. Cancel anytime during the trial period

## Components Implemented

### 1. Backend API (server.js)
- **New endpoint**: `/api/razorpay/create-trial-subscription`
- **Enhanced webhook handling**: Processes trial end and automatic charging
- **Trial management**: Handles trial start, end, and conversion

### 2. Payment Service (lib/paymentService.ts)
- **createTrialSubscription()**: Creates Razorpay trial subscription
- **storeTrialSubscription()**: Stores trial in database
- **isUserInTrial()**: Checks if user is in trial period
- **getTrialSubscription()**: Gets trial subscription details
- **endTrial()**: Converts trial to paid subscription

### 3. UI Components
- **TrialSubscriptionModal**: Modal for starting trial subscription
- **TrialStatusBanner**: Shows trial progress and time remaining
- **Trial notifications**: Real-time trial status updates

### 4. Database Schema
- **Trial columns**: Added to user_subscriptions table
- **Trial notifications**: New table for trial-related notifications
- **Audit logging**: Tracks trial events and conversions
- **Database functions**: Helper functions for trial management

## Implementation Steps

### Step 1: Database Setup
```sql
-- Run the trial subscription schema
\i TRIAL_SUBSCRIPTION_SCHEMA.sql
```

### Step 2: Environment Variables
Add these to your `.env.local` file:
```env
# Razorpay Configuration
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
VITE_RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
RAZORPAY_STARTUP_PLAN_ID=your_startup_plan_id

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 3: Razorpay Setup
1. Create a subscription plan in Razorpay dashboard
2. Set up webhook endpoint: `https://yourdomain.com/api/razorpay/webhook`
3. Configure webhook events: `subscription.activated`, `subscription.charged`, `payment.failed`

### Step 4: Frontend Integration

#### For Startup Registration:
```tsx
import TrialSubscriptionModal from './components/TrialSubscriptionModal';

// In your startup registration component
const [showTrialModal, setShowTrialModal] = useState(false);

const handleStartTrial = () => {
  setShowTrialModal(true);
};

// After successful startup registration
<TrialSubscriptionModal
  isOpen={showTrialModal}
  onClose={() => setShowTrialModal(false)}
  onSubscriptionSuccess={() => {
    // Handle successful trial start
    console.log('Trial started successfully');
  }}
  userId={currentUser.id}
  startupName={startupName}
/>
```

#### For Trial Status Display:
```tsx
import TrialStatusBanner from './components/TrialStatusBanner';

// In your main app component
<TrialStatusBanner
  userId={currentUser.id}
  onTrialEnd={() => {
    // Handle trial end
    console.log('Trial ended');
  }}
/>
```

### Step 5: Trial Flow Implementation

#### Starting a Trial:
1. User completes startup registration
2. Show `TrialSubscriptionModal`
3. User selects subscription plan
4. Create Razorpay trial subscription
5. Store trial in database
6. Show `TrialStatusBanner`

#### During Trial:
1. User has full access to all features
2. `TrialStatusBanner` shows progress and time remaining
3. Notifications for trial status updates
4. User can cancel anytime

#### Trial End:
1. Razorpay automatically charges user
2. Webhook processes the charge event
3. Database updates trial status
4. User continues with paid subscription

## API Endpoints

### Create Trial Subscription
```typescript
POST /api/razorpay/create-trial-subscription
{
  "user_id": "uuid",
  "plan_id": "uuid",
  "startup_count": 1
}
```

### Webhook Events
- `subscription.activated`: Trial started
- `subscription.charged`: Trial ended, payment processed
- `payment.failed`: Payment failed, mark as past_due

## Database Functions

### Check Trial Status
```sql
SELECT is_user_in_trial('user-uuid');
```

### Get Trial Days Remaining
```sql
SELECT get_trial_days_remaining('user-uuid');
```

### End Trial and Convert
```sql
SELECT end_trial_and_convert('subscription-uuid');
```

## Trial Notifications

The system automatically creates notifications for:
- Trial started
- Trial ending soon (1 day remaining)
- Trial ended
- Payment charged

## Security Considerations

1. **Webhook Verification**: Always verify Razorpay webhook signatures
2. **Trial Limits**: Ensure users can only have one active trial
3. **Payment Security**: Use Razorpay's secure payment processing
4. **Data Validation**: Validate all trial-related data

## Testing

### Development Testing
- Set `NODE_ENV=development` for 2-minute trials
- Use Razorpay test mode
- Test webhook events with ngrok

### Production Testing
- Set `NODE_ENV=production` for 7-day trials
- Use Razorpay live mode
- Monitor webhook events and database updates

## Monitoring

### Key Metrics to Track
- Trial conversion rate
- Trial cancellation rate
- Payment success rate
- Trial duration

### Database Queries for Monitoring
```sql
-- Active trials
SELECT COUNT(*) FROM active_trial_subscriptions;

-- Trials ending soon
SELECT COUNT(*) FROM active_trial_subscriptions 
WHERE trial_status = 'ending_soon';

-- Trial conversion rate
SELECT 
  COUNT(*) as total_trials,
  COUNT(CASE WHEN is_in_trial = false THEN 1 END) as converted
FROM user_subscriptions 
WHERE trial_start IS NOT NULL;
```

## Troubleshooting

### Common Issues
1. **Trial not starting**: Check Razorpay plan ID and webhook configuration
2. **Payment not processing**: Verify webhook secret and endpoint
3. **Trial not ending**: Check webhook events and database updates
4. **Notifications not showing**: Verify notification triggers and database functions

### Debug Steps
1. Check Razorpay dashboard for subscription status
2. Verify webhook events in Razorpay logs
3. Check database for trial status updates
4. Review application logs for errors

## Support

For issues with the trial subscription system:
1. Check the database audit log for trial events
2. Verify Razorpay subscription status
3. Review webhook event processing
4. Check user subscription status in database

## Future Enhancements

1. **Trial Extensions**: Allow extending trial period
2. **Trial Analytics**: Detailed trial performance metrics
3. **Trial Customization**: Different trial periods for different plans
4. **Trial Onboarding**: Guided trial experience for new users






