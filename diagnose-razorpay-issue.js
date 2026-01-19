#!/usr/bin/env node

/**
 * Diagnostic: Test if /api/razorpay/create-subscription endpoint is working
 * This helps identify why subscription IDs might be missing
 */

import dotenv from 'dotenv';

dotenv.config();

const RAZORPAY_KEY_ID = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.VITE_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

console.log('🔍 DIAGNOSING: Why Razorpay Subscription ID Was Missing\n');

// Check 1: Razorpay credentials
console.log('CHECK 1: Razorpay Credentials');
console.log('================================');
if (!RAZORPAY_KEY_ID) {
  console.log('❌ RAZORPAY_KEY_ID is missing!');
  console.log('   Set in .env or environment variables');
}  else {
  console.log('✅ RAZORPAY_KEY_ID is set');
  console.log(`   Key (first 20 chars): ${RAZORPAY_KEY_ID.substring(0, 20)}...`);
}

if (!RAZORPAY_KEY_SECRET) {
  console.log('❌ RAZORPAY_KEY_SECRET is missing!');
  console.log('   Set in .env or environment variables');
} else {
  console.log('✅ RAZORPAY_KEY_SECRET is set');
  console.log(`   Secret (first 20 chars): ${RAZORPAY_KEY_SECRET.substring(0, 20)}...`);
}

// Check 2: Test Razorpay API directly
console.log('\nCHECK 2: Testing Razorpay API Connectivity');
console.log('==========================================');

async function testRazorpayAPI() {
  try {
    const authHeader = "Basic " + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
    
    console.log('Testing: GET /api/v1/plans (to verify credentials work)');
    const response = await fetch("https://api.razorpay.com/v1/plans?limit=1", {
      method: "GET",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json"
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Razorpay API is accessible');
      console.log(`   Found ${data.count} plans in account`);
      return true;
    } else {
      console.log(`❌ Razorpay API returned error: ${response.status}`);
      const error = await response.text();
      console.log(`   Error: ${error.substring(0, 200)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Failed to connect to Razorpay API: ${error.message}`);
    return false;
  }
}

// Check 3: What might cause subscription ID to be missing
console.log('\nCHECK 3: Possible Causes of Missing Subscription ID');
console.log('==================================================');
console.log(`
1. SUBSCRIPTION CREATION FAILED
   - Server endpoint /api/razorpay/create-subscription returned error
   - Frontend continued without checking for error
   - razorpaySubscription.id was undefined
   
2. CREDENTIALS ISSUE
   - RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET changed/expired
   - API calls to create subscription failed
   
3. RATE LIMITING
   - Too many subscription creation requests
   - Razorpay API started rejecting requests
   
4. PLAN ID ISSUE  
   - getOrCreateRazorpayPlan() failed to create plan
   - Subscription creation failed because plan_id is invalid
   
5. FRONTEND ERROR HANDLING
   - Frontend didn't handle subscription creation errors
   - Proceeded with undefined subscription ID
   
6. TIMEOUT/NETWORK ISSUE
   - Network latency caused timeout
   - Frontend got partial/empty response
`);

// Check 4: Verification steps
console.log('CHECK 4: How to Verify');
console.log('====================');
console.log(`
To check if this is the actual issue:

1. Test the endpoint locally:
   curl -X POST http://localhost:3001/api/razorpay/create-subscription \\
     -H "Content-Type: application/json" \\
     -d '{
       "user_id": "test-user-123",
       "final_amount": 500,
       "interval": "monthly",
       "plan_name": "Test Plan"
     }'
   
2. Check if you get response like:
   { "id": "sub_xxx", "plan_id": "plan_xxx", ... }
   
   OR error like:
   { "error": "..." }

3. Check server.js logs for "create-subscription error"

4. Look at browser console for payment errors

5. Check if Razorpay API is rate limiting:
   GET https://api.razorpay.com/v1/subscriptions?limit=1
`);

// Run the test
await testRazorpayAPI();

console.log('\n' + '='.repeat(60));
console.log('NEXT STEPS:');
console.log('='.repeat(60));
console.log(`
1. If Razorpay API test PASSED:
   → Problem is in local subscription creation logic
   → Check server.js create-subscription endpoint logs
   → Add logging to see what's being returned

2. If Razorpay API test FAILED:
   → Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
   → Contact Razorpay support to verify credentials
   → Check if IP is whitelisted
   
3. If credentials look OK:
   → Add console.log statements in server.js to log responses
   → Test with curl/Postman directly
   → Check network tab in browser DevTools
`);
