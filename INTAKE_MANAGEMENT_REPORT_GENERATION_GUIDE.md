# Intake Management Report Generation Feature

## Overview

A new "Generate Report" button has been added to the Facilitation Center Dashboard's Intake Management CRM view. This feature allows facilitators to download a comprehensive CSV report containing all application details for a specific program/opportunity.

## What's Included in the Report

The generated CSV file includes the following columns:

### Static Columns
- **Startup Name**: Name of the applying startup
- **Email**: Startup founder/contact email address
- **Program**: Program/Opportunity name
- **Status**: Application status (pending, accepted, rejected, etc.)
- **Diligence Status**: Due diligence status (none, requested, approved)
- **Shortlisted**: Whether the startup is shortlisted (Yes/No)
- **Sector**: Business sector/domain
- **Stage**: Startup stage (Ideation, MVP, Scaling, etc.)
- **Pitch Deck URL**: Link to pitch deck document
- **Pitch Video URL**: Link to pitch video
- **Agreement URL**: Link to any agreement document
- **Application Date**: When the application was submitted

### Dynamic Columns
- **Response Questions & Answers**: All questions and corresponding answers submitted by startups in the application form are included as individual columns

## How to Use

1. Navigate to **Facilitation Center Dashboard** → **Intake Management** tab
2. Select a program/opportunity from the dropdown
3. Switch to **CRM** view if not already there
4. Click the **"Generate Report"** button in the header
5. A CSV file will automatically download with the filename format: `{program_name}_applications_{date}.csv`

## Button Features

- **Generate Report Button**: Located in the header bar next to the Customize button
- **Download Icon**: Shows a download icon to indicate the export functionality
- **Loading State**: Button text changes to "Generating..." while processing
- **Disabled State**: Button is disabled when:
  - No applications exist for the selected program
  - No program is currently selected
- **Error Handling**: Displays message if report generation fails

## Technical Implementation

### New Files Created

1. **lib/opportunityReportService.ts**
   - `getApplicationsReportData()`: Fetches all application details with responses
   - `generateCSV()`: Converts data to CSV format
   - `downloadCSV()`: Triggers browser download
   - `generateAndDownloadReport()`: Main orchestration function

### Modified Files

1. **components/IntakeCRMBoard.tsx**
   - Added `programName` prop to receive program name
   - Added `Generate Report` button with Download icon
   - Added `handleGenerateReport()` function
   - Added `isGeneratingReport` state for loading feedback

2. **components/FacilitatorView.tsx**
   - Passes `programName` prop to IntakeCRMBoard component
   - Retrieves program name from selected opportunity

## Data Sources

The report pulls data from:

1. **opportunity_applications** table
   - Application ID, status, diligence status
   - Shortlist status
   - Pitch deck and video URLs
   - Agreement URL
   - Sector and stage

2. **startups** table
   - Startup name and ID

3. **user_profiles** table
   - Startup email address (via user_id relationship)

4. **incubation_opportunities** table
   - Program name and opportunity ID

5. **opportunity_application_responses** table
   - All custom form responses submitted by startups

6. **application_question_bank** table
   - Question text and question type for display in CSV header

## CSV Format Details

- **Delimiter**: Comma (,)
- **Text Encoding**: UTF-8
- **Line Ending**: Unix (LF)
- **Quoted Fields**: All fields are properly quoted to handle special characters
- **Date Format**: MM/DD/YYYY

### Example Filename
```
umn_applications_2024-02-09.csv
```

## Benefits

1. **Comprehensive Documentation**: All application details in one downloadable file
2. **Easy Analysis**: Open in Excel, Google Sheets, or any spreadsheet tool
3. **Data Portability**: Share reports with team members or external stakeholders
4. **Audit Trail**: Keep records of all submitted applications and responses
5. **Quick Decision Making**: View all information at a glance for fast evaluation

## Future Enhancements (Optional)

- Filter options (by status, shortlist, etc.) before export
- Multiple format support (Excel, PDF)
- Email report directly to stakeholders
- Scheduled automated reports
- Custom column selection
- Data visualization charts within the report

## Troubleshooting

### Button is Disabled
- Ensure a program is selected from the dropdown
- Verify there are applications for the selected program
- Check if you have proper permissions to access the data

### Report Download Fails
- Check browser console for error messages
- Verify internet connection is stable
- Try a different browser
- Contact support if issue persists

### Missing Data in Report
- Ensure startups have submitted all required form responses
- Verify pitch materials (deck, video) were uploaded
- Check if diligence documents are properly stored

## Permissions

Only facilitators who created a program/opportunity can:
- View their program's applications
- Generate reports for their programs

The report respects existing RLS policies and shows only data accessible to the logged-in facilitator.

---

**Feature Added**: February 2024
**Status**: Production Ready
