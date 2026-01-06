/**
 * Direct API Testing Script for Google Calendar and Meet APIs
 * 
 * This script tests both Google APIs directly:
 * 1. Google Meet Link Generation
 * 2. Google Calendar Event Creation
 * 
 * Usage:
 *   node test-google-apis.js
 * 
 * Or with environment variables:
 *   API_BASE_URL=https://your-domain.com node test-google-apis.js
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

console.log('🧪 Testing Google APIs...\n');
console.log(`API Base URL: ${API_BASE_URL}\n`);

// Test 1: Generate Google Meet Link
async function testMeetLinkGeneration() {
  console.log('📹 TEST 1: Google Meet Link Generation');
  console.log('─'.repeat(50));
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/google-calendar?action=generate-meet-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error Response:', errorText);
      return null;
    }

    const data = await response.json();
    console.log('✅ Response:', JSON.stringify(data, null, 2));
    
    if (data.meetLink) {
      const meetLink = data.meetLink;
      console.log(`\n✅ Meet Link Generated: ${meetLink}`);
      
      // Validate format
      const isValidFormat = /^https:\/\/meet\.google\.com\/[a-z0-9-]+(\?.*)?$/i.test(meetLink);
      if (isValidFormat) {
        console.log('✅ Meet Link Format: Valid');
      } else {
        console.log('⚠️  Meet Link Format: Invalid (unexpected format)');
      }
      
      // Check if event ID is returned (for cleanup)
      if (data.eventId) {
        console.log(`ℹ️  Event ID: ${data.eventId} (can be used for cleanup)`);
      }
      
      return meetLink;
    } else {
      console.error('❌ No meetLink in response');
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    return null;
  }
}

// Test 2: Create Google Calendar Event with Meet Link
async function testCalendarEventCreation() {
  console.log('\n\n📅 TEST 2: Google Calendar Event Creation with Meet Link');
  console.log('─'.repeat(50));
  
  try {
    // Create event for 1 hour from now
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    
    const eventData = {
      event: {
        summary: 'Test Mentoring Session - API Test',
        description: 'This is a test event created to verify Google Calendar API integration',
        start: {
          dateTime: now.toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: oneHourLater.toISOString(),
          timeZone: 'UTC'
        },
        attendees: [
          // Add test emails if you want to test attendee functionality
          // { email: 'test@example.com' }
        ]
      }
    };

    console.log('📤 Sending request...');
    console.log('Event Data:', JSON.stringify(eventData, null, 2));
    
    const response = await fetch(`${API_BASE_URL}/api/google-calendar?action=create-event-service-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });

    console.log(`\nStatus: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error Response:', errorText);
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Error Details:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        // Not JSON, already logged
      }
      return null;
    }

    const data = await response.json();
    console.log('\n✅ Response:', JSON.stringify(data, null, 2));
    
    if (data.meetLink || data.hangoutLink) {
      const meetLink = data.meetLink || data.hangoutLink;
      console.log(`\n✅ Calendar Event Created Successfully!`);
      console.log(`   Event ID: ${data.eventId}`);
      console.log(`   Meet Link: ${meetLink}`);
      console.log(`   Calendar ID: ${data.calendarId || 'primary'}`);
      
      // Validate format
      const isValidFormat = /^https:\/\/meet\.google\.com\/[a-z0-9-]+(\?.*)?$/i.test(meetLink);
      if (isValidFormat) {
        console.log('✅ Meet Link Format: Valid');
      } else {
        console.log('⚠️  Meet Link Format: Invalid (unexpected format)');
      }
      
      return {
        eventId: data.eventId,
        meetLink: meetLink,
        calendarId: data.calendarId
      };
    } else {
      console.error('❌ No meetLink in response');
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    return null;
  }
}

// Test 3: Verify Meet Link is Accessible
async function testMeetLinkAccess(meetLink) {
  if (!meetLink) {
    console.log('\n⚠️  Skipping Meet Link Access Test (no link provided)');
    return;
  }
  
  console.log('\n\n🔗 TEST 3: Verify Meet Link is Accessible');
  console.log('─'.repeat(50));
  console.log(`Testing link: ${meetLink}`);
  
  try {
    // Just check if the URL is valid and accessible
    const response = await fetch(meetLink, {
      method: 'HEAD',
      redirect: 'follow'
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Final URL: ${response.url}`);
    
    if (response.ok || response.status === 200 || response.status === 302) {
      console.log('✅ Meet Link is accessible');
    } else {
      console.log('⚠️  Meet Link returned unexpected status');
    }
  } catch (error) {
    console.log('⚠️  Could not verify link accessibility (this is normal for Meet links)');
    console.log('   Note: Meet links may require authentication to verify');
  }
}

// Run all tests
async function runAllTests() {
  console.log('='.repeat(50));
  console.log('🚀 Starting Google API Tests');
  console.log('='.repeat(50));
  
  // Test 1: Meet Link Generation
  const meetLink1 = await testMeetLinkGeneration();
  
  // Test 2: Calendar Event Creation
  const calendarResult = await testCalendarEventCreation();
  
  // Test 3: Verify Meet Link Access
  if (calendarResult && calendarResult.meetLink) {
    await testMeetLinkAccess(calendarResult.meetLink);
  } else if (meetLink1) {
    await testMeetLinkAccess(meetLink1);
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  
  console.log(`\n✅ Meet Link Generation: ${meetLink1 ? 'PASSED' : 'FAILED'}`);
  console.log(`✅ Calendar Event Creation: ${calendarResult ? 'PASSED' : 'FAILED'}`);
  
  if (meetLink1 && calendarResult) {
    console.log('\n🎉 All tests passed! Google APIs are working correctly.');
    console.log('\n📝 Next Steps:');
    console.log('   1. Test booking a session in the app');
    console.log('   2. Verify Meet link appears in dashboard');
    console.log('   3. Click the Meet link to ensure it opens correctly');
  } else {
    console.log('\n⚠️  Some tests failed. Please check:');
    console.log('   1. Environment variables are set correctly');
    console.log('   2. Google Service Account has proper permissions');
    console.log('   3. API endpoints are accessible');
    console.log('   4. Check Vercel logs for detailed error messages');
  }
  
  console.log('\n');
}

// Check if running in Node.js environment
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ with native fetch support');
  console.error('   Or install node-fetch: npm install node-fetch');
  console.error('\n   Alternatively, use the curl commands in test-google-apis.sh');
  process.exit(1);
}

// Run tests
runAllTests().catch(error => {
  console.error('\n❌ Fatal Error:', error);
  process.exit(1);
});

