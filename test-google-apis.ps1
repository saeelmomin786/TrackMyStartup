# Direct API Testing Script for Google Calendar and Meet APIs (PowerShell)
# 
# This script tests both Google APIs directly:
# 1. Google Meet Link Generation
# 2. Google Calendar Event Creation
# 
# Usage:
#   .\test-google-apis.ps1
# 
# Or with custom API URL:
#   $env:API_BASE_URL="https://your-domain.com"; .\test-google-apis.ps1

$API_BASE_URL = if ($env:API_BASE_URL) { $env:API_BASE_URL } else { "http://localhost:3000" }

Write-Host "🧪 Testing Google APIs..." -ForegroundColor Cyan
Write-Host ""
Write-Host "API Base URL: $API_BASE_URL" -ForegroundColor Gray
Write-Host ""

# Test 1: Generate Google Meet Link
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "📹 TEST 1: Google Meet Link Generation" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/api/google-calendar?action=generate-meet-link" `
        -Method Post `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "✅ Request successful" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Gray
    $response | ConvertTo-Json -Depth 10
    
    if ($response.meetLink) {
        Write-Host ""
        Write-Host "✅ Meet Link Generated: $($response.meetLink)" -ForegroundColor Green
        
        # Validate format
        if ($response.meetLink -match "^https://meet\.google\.com/[a-z0-9-]+") {
            Write-Host "✅ Meet Link Format: Valid" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Meet Link Format: Unexpected format" -ForegroundColor Yellow
        }
        
        if ($response.eventId) {
            Write-Host "ℹ️  Event ID: $($response.eventId) (can be used for cleanup)" -ForegroundColor Gray
        }
        
        $script:meetLink1 = $response.meetLink
    } else {
        Write-Host "❌ No meetLink in response" -ForegroundColor Red
        $script:meetLink1 = $null
    }
} catch {
    Write-Host "❌ Request failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    $script:meetLink1 = $null
}

# Test 2: Create Google Calendar Event with Meet Link
Write-Host ""
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "📅 TEST 2: Google Calendar Event Creation with Meet Link" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

# Create event for 1 hour from now
$now = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
$oneHourLater = (Get-Date).AddHours(1).ToString("yyyy-MM-ddTHH:mm:ssZ")

$eventData = @{
    event = @{
        summary = "Test Mentoring Session - API Test"
        description = "This is a test event created to verify Google Calendar API integration"
        start = @{
            dateTime = $now
            timeZone = "UTC"
        }
        end = @{
            dateTime = $oneHourLater
            timeZone = "UTC"
        }
        attendees = @()
    }
} | ConvertTo-Json -Depth 10

Write-Host "📤 Sending request..." -ForegroundColor Gray
Write-Host "Event Data:" -ForegroundColor Gray
Write-Host $eventData -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$API_BASE_URL/api/google-calendar?action=create-event-service-account" `
        -Method Post `
        -ContentType "application/json" `
        -Body $eventData `
        -ErrorAction Stop
    
    Write-Host "✅ Request successful" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Gray
    $response | ConvertTo-Json -Depth 10
    
    $meetLink2 = $response.meetLink
    if (-not $meetLink2) {
        $meetLink2 = $response.hangoutLink
    }
    
    if ($meetLink2) {
        Write-Host ""
        Write-Host "✅ Calendar Event Created Successfully!" -ForegroundColor Green
        Write-Host "   Event ID: $($response.eventId)" -ForegroundColor Gray
        Write-Host "   Meet Link: $meetLink2" -ForegroundColor Gray
        Write-Host "   Calendar ID: $($response.calendarId)" -ForegroundColor Gray
        
        # Validate format
        if ($meetLink2 -match "^https://meet\.google\.com/[a-z0-9-]+") {
            Write-Host "✅ Meet Link Format: Valid" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Meet Link Format: Unexpected format" -ForegroundColor Yellow
        }
        
        $script:calendarResult = @{
            eventId = $response.eventId
            meetLink = $meetLink2
            calendarId = $response.calendarId
        }
    } else {
        Write-Host "❌ No meetLink in response" -ForegroundColor Red
        $script:calendarResult = $null
    }
} catch {
    Write-Host "❌ Request failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    $script:calendarResult = $null
}

# Summary
Write-Host ""
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "📊 TEST SUMMARY" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

if ($script:meetLink1) {
    Write-Host "✅ Meet Link Generation: PASSED" -ForegroundColor Green
} else {
    Write-Host "❌ Meet Link Generation: FAILED" -ForegroundColor Red
}

if ($script:calendarResult) {
    Write-Host "✅ Calendar Event Creation: PASSED" -ForegroundColor Green
} else {
    Write-Host "❌ Calendar Event Creation: FAILED" -ForegroundColor Red
}

Write-Host ""

if ($script:meetLink1 -and $script:calendarResult) {
    Write-Host "🎉 All tests passed! Google APIs are working correctly." -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next Steps:" -ForegroundColor Cyan
    Write-Host "   1. Test booking a session in the app" -ForegroundColor Gray
    Write-Host "   2. Verify Meet link appears in dashboard" -ForegroundColor Gray
    Write-Host "   3. Click the Meet link to ensure it opens correctly" -ForegroundColor Gray
} else {
    Write-Host "⚠️  Some tests failed. Please check:" -ForegroundColor Yellow
    Write-Host "   1. Environment variables are set correctly" -ForegroundColor Gray
    Write-Host "   2. Google Service Account has proper permissions" -ForegroundColor Gray
    Write-Host "   3. API endpoints are accessible" -ForegroundColor Gray
    Write-Host "   4. Check Vercel logs for detailed error messages" -ForegroundColor Gray
}

Write-Host ""


