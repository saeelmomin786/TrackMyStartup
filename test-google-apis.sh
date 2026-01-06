#!/bin/bash

# Direct API Testing Script for Google Calendar and Meet APIs
# 
# This script tests both Google APIs directly using curl:
# 1. Google Meet Link Generation
# 2. Google Calendar Event Creation
# 
# Usage:
#   chmod +x test-google-apis.sh
#   ./test-google-apis.sh
# 
# Or with custom API URL:
#   API_BASE_URL=https://your-domain.com ./test-google-apis.sh

API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"

echo "🧪 Testing Google APIs..."
echo "API Base URL: $API_BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Generate Google Meet Link
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📹 TEST 1: Google Meet Link Generation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

RESPONSE1=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/google-calendar?action=generate-meet-link" \
  -H "Content-Type: application/json")

HTTP_CODE1=$(echo "$RESPONSE1" | tail -n1)
BODY1=$(echo "$RESPONSE1" | sed '$d')

echo "HTTP Status: $HTTP_CODE1"
echo ""

if [ "$HTTP_CODE1" -eq 200 ]; then
  echo -e "${GREEN}✅ Request successful${NC}"
  echo "Response:"
  echo "$BODY1" | jq '.' 2>/dev/null || echo "$BODY1"
  
  MEET_LINK1=$(echo "$BODY1" | jq -r '.meetLink' 2>/dev/null)
  EVENT_ID1=$(echo "$BODY1" | jq -r '.eventId' 2>/dev/null)
  
  if [ -n "$MEET_LINK1" ] && [ "$MEET_LINK1" != "null" ]; then
    echo ""
    echo -e "${GREEN}✅ Meet Link Generated: $MEET_LINK1${NC}"
    
    # Validate format
    if [[ $MEET_LINK1 =~ ^https://meet\.google\.com/[a-z0-9-]+ ]]; then
      echo -e "${GREEN}✅ Meet Link Format: Valid${NC}"
    else
      echo -e "${YELLOW}⚠️  Meet Link Format: Unexpected format${NC}"
    fi
    
    if [ -n "$EVENT_ID1" ] && [ "$EVENT_ID1" != "null" ]; then
      echo "ℹ️  Event ID: $EVENT_ID1 (can be used for cleanup)"
    fi
  else
    echo -e "${RED}❌ No meetLink in response${NC}"
    MEET_LINK1=""
  fi
else
  echo -e "${RED}❌ Request failed${NC}"
  echo "Error Response:"
  echo "$BODY1" | jq '.' 2>/dev/null || echo "$BODY1"
  MEET_LINK1=""
fi

# Test 2: Create Google Calendar Event with Meet Link
echo ""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📅 TEST 2: Google Calendar Event Creation with Meet Link"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create event for 1 hour from now
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
ONE_HOUR_LATER=$(date -u -d "+1 hour" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v+1H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "$NOW" +"%Y-%m-%dT%H:%M:%SZ" | awk '{print $1}')

EVENT_DATA=$(cat <<EOF
{
  "event": {
    "summary": "Test Mentoring Session - API Test",
    "description": "This is a test event created to verify Google Calendar API integration",
    "start": {
      "dateTime": "$NOW",
      "timeZone": "UTC"
    },
    "end": {
      "dateTime": "$ONE_HOUR_LATER",
      "timeZone": "UTC"
    },
    "attendees": []
  }
}
EOF
)

echo "📤 Sending request..."
echo "Event Data:"
echo "$EVENT_DATA" | jq '.' 2>/dev/null || echo "$EVENT_DATA"
echo ""

RESPONSE2=$(curl -s -w "\n%{http_code}" -X POST \
  "$API_BASE_URL/api/google-calendar?action=create-event-service-account" \
  -H "Content-Type: application/json" \
  -d "$EVENT_DATA")

HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
BODY2=$(echo "$RESPONSE2" | sed '$d')

echo "HTTP Status: $HTTP_CODE2"
echo ""

if [ "$HTTP_CODE2" -eq 200 ]; then
  echo -e "${GREEN}✅ Request successful${NC}"
  echo "Response:"
  echo "$BODY2" | jq '.' 2>/dev/null || echo "$BODY2"
  
  MEET_LINK2=$(echo "$BODY2" | jq -r '.meetLink // .hangoutLink' 2>/dev/null)
  EVENT_ID2=$(echo "$BODY2" | jq -r '.eventId' 2>/dev/null)
  CALENDAR_ID2=$(echo "$BODY2" | jq -r '.calendarId' 2>/dev/null)
  
  if [ -n "$MEET_LINK2" ] && [ "$MEET_LINK2" != "null" ]; then
    echo ""
    echo -e "${GREEN}✅ Calendar Event Created Successfully!${NC}"
    echo "   Event ID: $EVENT_ID2"
    echo "   Meet Link: $MEET_LINK2"
    echo "   Calendar ID: ${CALENDAR_ID2:-primary}"
    
    # Validate format
    if [[ $MEET_LINK2 =~ ^https://meet\.google\.com/[a-z0-9-]+ ]]; then
      echo -e "${GREEN}✅ Meet Link Format: Valid${NC}"
    else
      echo -e "${YELLOW}⚠️  Meet Link Format: Unexpected format${NC}"
    fi
  else
    echo -e "${RED}❌ No meetLink in response${NC}"
    MEET_LINK2=""
  fi
else
  echo -e "${RED}❌ Request failed${NC}"
  echo "Error Response:"
  echo "$BODY2" | jq '.' 2>/dev/null || echo "$BODY2"
  MEET_LINK2=""
fi

# Summary
echo ""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -n "$MEET_LINK1" ]; then
  echo -e "${GREEN}✅ Meet Link Generation: PASSED${NC}"
else
  echo -e "${RED}❌ Meet Link Generation: FAILED${NC}"
fi

if [ -n "$MEET_LINK2" ]; then
  echo -e "${GREEN}✅ Calendar Event Creation: PASSED${NC}"
else
  echo -e "${RED}❌ Calendar Event Creation: FAILED${NC}"
fi

echo ""

if [ -n "$MEET_LINK1" ] && [ -n "$MEET_LINK2" ]; then
  echo -e "${GREEN}🎉 All tests passed! Google APIs are working correctly.${NC}"
  echo ""
  echo "📝 Next Steps:"
  echo "   1. Test booking a session in the app"
  echo "   2. Verify Meet link appears in dashboard"
  echo "   3. Click the Meet link to ensure it opens correctly"
else
  echo -e "${YELLOW}⚠️  Some tests failed. Please check:${NC}"
  echo "   1. Environment variables are set correctly"
  echo "   2. Google Service Account has proper permissions"
  echo "   3. API endpoints are accessible"
  echo "   4. Check Vercel logs for detailed error messages"
fi

echo ""


