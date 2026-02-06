import { supabase } from '../lib/supabase';

export interface Form2Response {
  id?: string;
  application_id: string;
  question_id: string;
  answer_text?: string;
  answer_file_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Form2QuestionDisplay {
  id: string;
  question_id: string;
  question_text: string;
  question_type: string; // 'text', 'textarea', 'file', 'date', 'url', 'number', 'email', 'single_select', 'multi_select'
  is_required: boolean;
  selection_type?: string;
  options?: string[];
  display_order: number;
}

export interface Form2SubmissionData {
  application_id: string;
  opportunity_id: string;
  responses: {
    [question_id: string]: {
      answer_text?: string;
      answer_file_url?: string;
    };
  };
}

class Form2ResponseService {
  /**
   * Get Form 2 questions for an opportunity with their details
   */
  async getForm2Questions(opportunityId: string): Promise<Form2QuestionDisplay[]> {
    try {
      console.log('🔍 Fetching Form 2 questions for opportunity:', opportunityId);
      const table = supabase.from('incubation_opportunity_form2_questions') as any;
      const { data, error } = await table
        .select(`
          id,
          question_id,
          is_required,
          selection_type,
          display_order,
          application_question_bank (
            *
          )
        `)
        .eq('opportunity_id', opportunityId)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('❌ Error fetching Form 2 questions:', error);
        // Return empty array on error instead of throwing
        return [];
      }

      console.log('✅ Fetched Form 2 questions:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('📝 Sample question:', data[0]);
        console.log('📝 Question bank fields:', Object.keys(data[0].application_question_bank || {}));
      }

      return (data || []).map((item: any) => {
        const qbank = item.application_question_bank || {};
        // Try different possible field names for the question text
        const questionText = qbank.question || qbank.text || qbank.question_text || qbank.questionText || '';
        
        return {
          id: item.id,
          question_id: item.question_id,
          question_text: questionText,
          question_type: qbank.question_type || qbank.type || 'text',
          is_required: item.is_required || false,
          selection_type: item.selection_type,
          options: qbank.options || [],
          display_order: item.display_order || 0,
        };
      });
    } catch (error) {
      console.error('❌ Form2ResponseService.getForm2Questions error:', error);
      // Return empty array on error instead of throwing
      return [];
    }
  }

  /**
   * Get Form 2 configuration (title, description)
   */
  async getForm2Config(opportunityId: string) {
    try {
      const table = supabase.from('incubation_opportunities') as any;
      const { data, error } = await table
        .select('has_form2, form2_title, form2_description')
        .eq('id', opportunityId)
        .maybeSingle();

      if (error || !data) {
        // Silently return default config on error (expected for RLS restrictions)
        return {
          has_form2: false,
          form2_title: 'Additional Information',
          form2_description: null
        };
      }

      return data;
    } catch (error) {
      // Silently return default config on error (expected for RLS restrictions)
      return {
        has_form2: false,
        form2_title: 'Additional Information',
        form2_description: null
      };
    }
  }

  /**
   * Get existing Form 2 responses for an application
   */
  async getForm2Responses(applicationId: string): Promise<Form2Response[]> {
    try {
      const { data, error } = await supabase
        .from('opportunity_form2_responses')
        .select('*')
        .eq('application_id', applicationId);

      if (error) {
        console.error('Error fetching Form 2 responses:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Form2ResponseService.getForm2Responses error:', error);
      throw error;
    }
  }

  /**
   * Save or update a single Form 2 response
   */
  async saveForm2Response(response: Form2Response): Promise<Form2Response> {
    try {
      // Check if response exists
      const { data: existing } = await supabase
        .from('opportunity_form2_responses')
        .select('id')
        .eq('application_id', response.application_id)
        .eq('question_id', response.question_id)
        .single();

      let result: any;

      if (existing) {
        // Update existing response
        const table = supabase.from('opportunity_form2_responses') as any;
        result = (await table
          .update({
            answer_text: response.answer_text,
            answer_file_url: response.answer_file_url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', (existing as any).id)
          .select()
          .single()) as any;
      } else {
        // Insert new response
        const table = supabase.from('opportunity_form2_responses') as any;
        result = (await table
          .insert([
            {
              application_id: response.application_id,
              question_id: response.question_id,
              answer_text: response.answer_text,
              answer_file_url: response.answer_file_url,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ])
          .select()
          .single()) as any;
      }

      const { data, error } = result;

      if (error) {
        console.error('Error saving Form 2 response:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Form2ResponseService.saveForm2Response error:', error);
      throw error;
    }
  }

  /**
   * Save all Form 2 responses for an application
   */
  async saveForm2Submission(
    applicationId: string,
    responses: { [questionId: string]: { answer_text?: string; answer_file_url?: string } }
  ): Promise<void> {
    try {
      const responsesToSave = Object.entries(responses).map(([questionId, answer]) => ({
        application_id: applicationId,
        question_id: questionId,
        answer_text: answer.answer_text || null,
        answer_file_url: answer.answer_file_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // Use upsert to handle insert or update
      const table = supabase.from('opportunity_form2_responses') as any;
      const { error } = await table
        .upsert(responsesToSave, {
          onConflict: 'application_id,question_id',
        });

      if (error) {
        console.error('Error submitting Form 2 responses:', error);
        throw error;
      }

      // Update application status to submitted
      await this.updateForm2Status(applicationId, 'submitted');
    } catch (error) {
      console.error('Form2ResponseService.saveForm2Submission error:', error);
      throw error;
    }
  }

  /**
   * Update Form 2 status on the application
   */
  async updateForm2Status(
    applicationId: string,
    status: 'pending' | 'submitted' | 'under_review'
  ): Promise<void> {
    try {
      const table = supabase.from('opportunity_applications') as any;
      const { error } = await table
        .update({
          form2_status: status,
          form2_submitted_at: status === 'submitted' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      if (error) {
        console.error('Error updating Form 2 status:', error);
        throw error;
      }
    } catch (error) {
      console.error('Form2ResponseService.updateForm2Status error:', error);
      throw error;
    }
  }

  /**
   * Upload a file for Form 2 response
   */
  async uploadForm2File(
    applicationId: string,
    questionId: string,
    file: File,
    bucket: string = 'incubation-documents'
  ): Promise<string> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `form2/${applicationId}/${questionId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: false });

      if (uploadError) {
        console.error('Error uploading Form 2 file:', uploadError);
        throw uploadError;
      }

      // Get the public URL
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return data?.publicUrl || '';
    } catch (error) {
      console.error('Form2ResponseService.uploadForm2File error:', error);
      throw error;
    }
  }

  /**
   * Validate Form 2 responses before submission
   */
  validateForm2Responses(
    questions: Form2QuestionDisplay[],
    responses: { [questionId: string]: any }
  ): { isValid: boolean; errors: { [questionId: string]: string } } {
    const errors: { [questionId: string]: string } = {};

    questions.forEach((question) => {
      const response = responses[question.question_id];

      // Check required fields
      if (question.is_required) {
        if (!response?.answer_text && !response?.answer_file_url) {
          errors[question.question_id] = `${question.question_text} is required`;
        }
      }

      // Validate email format
      if (question.question_type === 'email' && response?.answer_text) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(response.answer_text)) {
          errors[question.question_id] = 'Please enter a valid email address';
        }
      }

      // Validate URL format
      if (question.question_type === 'url' && response?.answer_text) {
        try {
          new URL(response.answer_text);
        } catch {
          errors[question.question_id] = 'Please enter a valid URL';
        }
      }

      // Validate number format
      if (question.question_type === 'number' && response?.answer_text) {
        if (isNaN(Number(response.answer_text))) {
          errors[question.question_id] = 'Please enter a valid number';
        }
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }
}

export const form2ResponseService = new Form2ResponseService();
