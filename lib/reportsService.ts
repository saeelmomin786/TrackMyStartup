import { supabase } from './supabase';

export interface ReportQuestion {
  id: string;
  report_id: string;
  question_text: string;
  question_type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect';
  options?: string[];
  is_from_pool: boolean;
  pool_question_id?: string;
  position: number;
  created_at: string;
}

export interface Report {
  id: string;
  facilitator_id: string;
  title: string;
  program_name: string;
  report_year: string;
  created_at: string;
  questions?: ReportQuestion[];
}

export interface ReportResponse {
  id: string;
  report_id: string;
  startup_id: string;
  startup_name: string;
  status: 'not_submitted' | 'submitted';
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportAnswer {
  id: string;
  response_id: string;
  question_id: string;
  answer: string | string[]; // JSON parsed
  created_at: string;
  updated_at: string;
}

class ReportsService {
  // ============ REPORTS ============
  async getReports(facilitatorId: string): Promise<Report[]> {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        report_questions (*)
      `)
      .eq('facilitator_id', facilitatorId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading reports:', error);
      return [];
    }

    return (data || []).map(report => ({
      ...report,
      questions: report.report_questions || []
    }));
  }

  async createReport(
    facilitatorId: string,
    title: string,
    programName: string,
    reportYear: string,
    questions: Omit<ReportQuestion, 'id' | 'report_id' | 'created_at'>[],
    targetStartupIds: string[]
  ): Promise<Report | null> {
    try {
      // 1. Create report
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .insert({
          facilitator_id: facilitatorId,
          title,
          program_name: programName,
          report_year: reportYear
        })
        .select()
        .single();

      if (reportError || !report) {
        console.error('Error creating report:', reportError);
        return null;
      }

      // 2. Create questions
      if (questions.length > 0) {
        const { error: questionsError } = await supabase
          .from('report_questions')
          .insert(
            questions.map((q, idx) => ({
              report_id: report.id,
              question_text: q.question_text,
              question_type: q.question_type,
              options: q.options ? JSON.stringify(q.options) : null,
              is_from_pool: q.is_from_pool,
              pool_question_id: q.pool_question_id,
              position: idx
            }))
          );

        if (questionsError) {
          console.error('Error creating questions:', questionsError);
          // Continue anyway - report is created
        }
      }

      // 3. Create response placeholders for target startups
      if (targetStartupIds.length > 0) {
        const { error: responsesError } = await supabase
          .from('report_responses')
          .insert(
            targetStartupIds.map(startupId => ({
              report_id: report.id,
              startup_id: startupId,
              startup_name: `Startup ${startupId}`, // Will be updated with actual name
              status: 'not_submitted' as const
            }))
          );

        if (responsesError) {
          console.error('Error creating responses:', responsesError);
          // Continue anyway
        }
      }

      return report;
    } catch (error) {
      console.error('Error in createReport:', error);
      return null;
    }
  }

  async deleteReport(reportId: string): Promise<boolean> {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId);

    if (error) {
      console.error('Error deleting report:', error);
      return false;
    }
    return true;
  }

  // ============ RESPONSES ============
  async getResponses(reportId: string): Promise<ReportResponse[]> {
    const { data, error } = await supabase
      .from('report_responses')
      .select('*')
      .eq('report_id', reportId)
      .order('created_at');

    if (error) {
      console.error('Error loading responses:', error);
      return [];
    }
    return data || [];
  }

  async updateResponseStatus(
    responseId: string,
    status: 'not_submitted' | 'submitted',
    submittedAt?: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('report_responses')
      .update({
        status,
        submitted_at: submittedAt
      })
      .eq('id', responseId);

    if (error) {
      console.error('Error updating response status:', error);
      return false;
    }
    return true;
  }

  // ============ ANSWERS ============
  async getAnswers(responseId: string): Promise<ReportAnswer[]> {
    const { data, error } = await supabase
      .from('report_answers')
      .select('*')
      .eq('response_id', responseId)
      .order('created_at');

    if (error) {
      console.error('Error loading answers:', error);
      return [];
    }

    return (data || []).map(answer => ({
      ...answer,
      answer: typeof answer.answer === 'string' ? JSON.parse(answer.answer) : answer.answer
    }));
  }

  async upsertAnswer(
    responseId: string,
    questionId: string,
    answer: string | string[]
  ): Promise<boolean> {
    const { error } = await supabase
      .from('report_answers')
      .upsert(
        {
          response_id: responseId,
          question_id: questionId,
          answer: JSON.stringify(answer)
        },
        { onConflict: 'response_id,question_id' }
      );

    if (error) {
      console.error('Error upserting answer:', error);
      return false;
    }
    return true;
  }
}

export const reportsService = new ReportsService();
