# Razorpay Trial Subscription Fix

## Issues Identified

1. **Duplicate API endpoints** in `server.js` causing conflicts
2. **Missing environment variables** for Razorpay plan IDs
3. **Complex plan caching system** that may not work in all environments
4. **Error handling** not providing clear feedback

## Fixes Applied

### 1. Removed Duplicate Endpoints
- Removed the second `/api/razorpay/create-trial-subscription` endpoint in `server.js`
- Kept the more comprehensive first endpoint with dynamic plan creation

### 2. Simplified Plan Creation
- Replaced complex `getOrCreateRazorpayPlan` function with direct Razorpay API calls
- Removed dependency on `razorpay_plans_cache` table
- Added proper error handling for plan creation

### 3. Enhanced Environment Variables
- Added missing Razorpay plan ID environment variables
- Made plan IDs optional (will be created dynamically if not set)

### 4. Improved Error Handling
- Added detailed error logging for debugging
- Better error messages for different failure scenarios
- Proper HTTP status codes

## How to Test the Fix

1. **Start the server**:
   ```bash
   npm run server
   ```

2. **Test the trial subscription endpoint**:
   ```bash
   curl -X POST http://localhost:3001/api/razorpay/create-trial-subscription \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "test-user-123",
       "trial_days": 30,
       "interval": "monthly",
       "plan_name": "Startup Plan",
       "final_amount": 299
     }'
   ```

3. **Check the response**:
   - Should return a Razorpay subscription object
   - Should not return 500 errors
   - Should create a plan dynamically if needed

## Environment Variables Required

```env
RAZORPAY_KEY_ID=rzp_live_RMzc3DoDdGLh9u
RAZORPAY_KEY_SECRET=IsYa9bHZOFX4f2vp44LNlDzJ
RAZORPAY_WEBHOOK_SECRET=L6FgWQm9rr@P38_
# Optional - will be created dynamically if not set
RAZORPAY_STARTUP_PLAN_ID_MONTHLY=
RAZORPAY_STARTUP_PLAN_ID_YEARLY=
RAZORPAY_STARTUP_PLAN_ID=
```

## Debugging Steps

If you still get 500 errors:

1. **Check server logs** for detailed error messages
2. **Verify Razorpay credentials** are correct
3. **Test Razorpay API directly**:
   ```bash
   curl -X GET https://api.razorpay.com/v1/plans \
     -H "Authorization: Basic $(echo -n 'rzp_live_RMzc3DoDdGLh9u:IsYa9bHZOFX4f2vp44LNlDzJ' | base64)"
   ```
4. **Check network connectivity** to Razorpay API
5. **Verify the request payload** matches expected format

## Expected Behavior

- ✅ Trial subscription creation should work without 500 errors
- ✅ Plans should be created dynamically based on `final_amount`
- ✅ Proper error messages should be returned for debugging
- ✅ Razorpay checkout should open successfully
- ✅ Trial period should be set correctly (30 days)

## Files Modified

- `server.js`: Removed duplicate endpoint, simplified plan creation
- `backend .env`: Added missing environment variables
- `RAZORPAY_TRIAL_FIX.md`: This documentation file
