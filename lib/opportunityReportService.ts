import { supabase } from './supabase';

export interface ApplicationDetailedReport {
  applicationId: string;
  startupName: string;
  startupEmail: string;
  startupId: number;
  programName: string;
  opportunityId: string;
  applicationStatus: string;
  diligenceStatus: string;
  shortlisted: boolean;
  sector: string;
  stage: string;
  pitchDeckUrl: string;
  pitchVideoUrl: string;
  agreementUrl: string;
  createdAt: string;
  responses: ApplicationResponse[];
}

export interface ApplicationResponse {
  questionId: string;
  questionText: string;
  answerText: string;
  questionType: string;
}

/**
 * Generate a detailed report for all applications in a program/opportunity
 * Includes all fields + responses
 */
export async function getApplicationsReportData(
  opportunityId: string,
  facilitatorId: string
): Promise<ApplicationDetailedReport[]> {
  try {
    // Fetch applications with full details
    const { data: applications, error: appError } = await supabase
      .from('opportunity_applications')
      .select(`
        id,
        startup_id,
        status,
        diligence_status,
        is_shortlisted,
        pitch_deck_url,
        pitch_video_url,
        agreement_url,
        domain,
        stage,
        created_at,
        startups!inner(id, name),
        incubation_opportunities!inner(id, program_name, facilitator_id)
      `)
      .eq('opportunity_id', opportunityId)
      .eq('incubation_opportunities.facilitator_id', facilitatorId);

    if (appError) {
      console.error('Error fetching applications:', appError);
      throw appError;
    }

    if (!applications || applications.length === 0) {
      return [];
    }

    // Get startup emails and responses
    const reportData: ApplicationDetailedReport[] = [];

    for (const app of applications) {
      try {
        // Get startup email from founders table (first founder's email)
        let startupEmail = 'N/A';
        if (app.startup_id) {
          try {
            const { data: founderData, error: founderError } = await supabase
              .from('founders')
              .select('email')
              .eq('startup_id', app.startup_id)
              .order('created_at', { ascending: true })
              .limit(1)
              .single();

            if (founderData?.email) {
              startupEmail = founderData.email;
              console.log(`✅ Found email for startup ${app.startup_id}:`, startupEmail);
            } else if (founderError) {
              console.warn(`⚠️ No founders found for startup ${app.startup_id}:`, founderError?.message);
            }
          } catch (emailError) {
            console.warn(`❌ Error fetching email for startup ${app.startup_id}:`, emailError);
            startupEmail = 'N/A';
          }
        }

        // Get responses for this application
        const { data: responses, error: respError } = await supabase
          .from('opportunity_application_responses')
          .select(`
            id,
            answer_text,
            application_question_bank!inner(
              id,
              question_text,
              question_type
            )
          `)
          .eq('application_id', app.id);

        if (respError) {
          console.warn('Error fetching responses for application:', appError);
        }

        const mappedResponses: ApplicationResponse[] = (responses || []).map((r: any) => ({
          questionId: r.application_question_bank?.id || '',
          questionText: r.application_question_bank?.question_text || '',
          answerText: r.answer_text || '',
          questionType: r.application_question_bank?.question_type || 'text'
        }));

        reportData.push({
          applicationId: app.id,
          startupName: app.startups?.name || 'Unknown',
          startupEmail: startupEmail,
          startupId: app.startup_id,
          programName: app.incubation_opportunities?.program_name || 'Unknown Program',
          opportunityId: app.opportunity_id || opportunityId,
          applicationStatus: app.status || 'pending',
          diligenceStatus: app.diligence_status || 'none',
          shortlisted: app.is_shortlisted || false,
          sector: app.domain || 'N/A',
          stage: app.stage || 'N/A',
          pitchDeckUrl: app.pitch_deck_url || '',
          pitchVideoUrl: app.pitch_video_url || '',
          agreementUrl: app.agreement_url || '',
          createdAt: app.created_at || '',
          responses: mappedResponses
        });
      } catch (error) {
        console.error('Error processing application:', app.id, error);
      }
    }

    return reportData;
  } catch (error) {
    console.error('Error in getApplicationsReportData:', error);
    throw error;
  }
}

/**
 * Convert report data to CSV format
 */
export function generateCSV(reports: ApplicationDetailedReport[]): string {
  if (reports.length === 0) {
    return '';
  }

  // Collect all unique questions across all applications
  const allQuestions = new Map<string, ApplicationResponse>();
  reports.forEach(report => {
    report.responses.forEach(response => {
      if (!allQuestions.has(response.questionId)) {
        allQuestions.set(response.questionId, response);
      }
    });
  });

  // Define static columns
  const staticColumns = [
    'Startup Name',
    'Email',
    'Program',
    'Status',
    'Diligence Status',
    'Shortlisted',
    'Sector',
    'Stage',
    'Pitch Deck URL',
    'Pitch Video URL',
    'Agreement URL',
    'Application Date'
  ];

  // Dynamic question columns
  const questionColumns = Array.from(allQuestions.values()).map(q => q.questionText);

  // Create header row
  const headers = [...staticColumns, ...questionColumns];
  const headerRow = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');

  // Create data rows
  const dataRows = reports.map(report => {
    const staticValues = [
      report.startupName,
      report.startupEmail,
      report.programName,
      report.applicationStatus,
      report.diligenceStatus,
      report.shortlisted ? 'Yes' : 'No',
      report.sector,
      report.stage,
      report.pitchDeckUrl,
      report.pitchVideoUrl,
      report.agreementUrl,
      formatDate(report.createdAt)
    ];

    // Add response values for each question
    const responseMap = new Map(report.responses.map(r => [r.questionId, r.answerText]));
    const questionValues = Array.from(allQuestions.values()).map(q => 
      responseMap.get(q.questionId) || ''
    );

    const rowValues = [...staticValues, ...questionValues];
    return rowValues
      .map(v => `"${String(v || '').replace(/"/g, '""')}"`)
      .join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper function to format date
 */
function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-US');
  } catch {
    return dateString;
  }
}

/**
 * Generate and download report for an opportunity
 */
export async function generateAndDownloadReport(
  opportunityId: string,
  programName: string,
  facilitatorId: string
): Promise<void> {
  try {
    const reports = await getApplicationsReportData(opportunityId, facilitatorId);
    const csv = generateCSV(reports);
    
    if (!csv) {
      throw new Error('No data to export');
    }

    const sanitizedProgramName = programName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${sanitizedProgramName}_applications_${new Date().toISOString().split('T')[0]}.csv`;
    
    downloadCSV(csv, filename);
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
}
