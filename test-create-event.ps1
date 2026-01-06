# Test the create-event-service-account endpoint
# This should work even though generate-meet-link doesn't

$now = (Get-Date).ToUniversalTime()
$oneHourLater = $now.AddHours(1)

$eventData = @{
    event = @{
        summary = "Test Mentoring Session - API Test"
        description = "This is a test event created to verify Google Calendar API integration"
        start = @{
            dateTime = $now.ToString("yyyy-MM-ddTHH:mm:ssZ")
            timeZone = "UTC"
        }
        end = @{
            dateTime = $oneHourLater.ToString("yyyy-MM-ddTHH:mm:ssZ")
            timeZone = "UTC"
        }
        attendees = @()
    }
} | ConvertTo-Json -Depth 10

Write-Host "Testing create-event-service-account endpoint..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Event Data:" -ForegroundColor Gray
Write-Host $eventData -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "https://trackmystartup.com/api/google-calendar?action=create-event-service-account" -Method Post -ContentType "application/json" -Body $eventData
    
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
    
    if ($response.meetLink -or $response.hangoutLink) {
        $meetLink = $response.meetLink -or $response.hangoutLink
        Write-Host ""
        Write-Host "✅ Meet Link Generated: $meetLink" -ForegroundColor Green
        Write-Host "✅ Event ID: $($response.eventId)" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ ERROR:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Details:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
    }
}


