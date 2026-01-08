import { supabase } from './supabase';

export interface ApplicationQuestion {
  id: string;
  questionText: string;
  category: string | null;
  questionType: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect';
  options: string[] | null;
  status: 'approved' | 'pending' | 'rejected';
  createdBy: string | null;
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectionReason: string | null;
  usageCount: number;
  updatedAt: string;
}

export interface CreateQuestionInput {
  questionText: string;
  category?: string;
  questionType?: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect';
  options?: string[]; // Required for select and multiselect types
  status?: 'approved' | 'pending' | 'rejected';
}

export interface UpdateQuestionStatusInput {
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface StartupAnswer {
  id: string;
  startupId: number;
  questionId: string;
  answerText: string;
  createdAt: string;
  updatedAt: string;
  question?: ApplicationQuestion;
}

export interface OpportunityQuestion {
  id: string;
  opportunityId: string;
  questionId: string;
  isRequired: boolean;
  displayOrder: number;
  question?: ApplicationQuestion;
}

class QuestionBankService {
  private questionTable = 'application_question_bank';
  private opportunityQuestionsTable = 'incubation_opportunity_questions';
  private startupAnswersTable = 'startup_application_answers';
  private applicationResponsesTable = 'opportunity_application_responses';

  // =====================================================
  // QUESTION BANK OPERATIONS
  // =====================================================

  /**
   * Get all approved questions (for facilitators to select)
   */
  async getApprovedQuestions(category?: string): Promise<ApplicationQuestion[]> {
    let query = supabase
      .from(this.questionTable)
      .select('*')
      .eq('status', 'approved')
      .order('category', { ascending: true })
      .order('usage_count', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(this.mapQuestion);
  }

  /**
   * Get pending questions (for admin approval)
   */
  async getPendingQuestions(): Promise<ApplicationQuestion[]> {
    const { data, error } = await supabase
      .from(this.questionTable)
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(this.mapQuestion);
  }

  /**
   * Get rejected questions (for admin review)
   */
  async getRejectedQuestions(): Promise<ApplicationQuestion[]> {
    const { data, error } = await supabase
      .from(this.questionTable)
      .select('*')
      .eq('status', 'rejected')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(this.mapQuestion);
  }

  /**
   * Get questions created by a specific facilitator (including pending)
   */
  async getFacilitatorQuestions(facilitatorId: string): Promise<ApplicationQuestion[]> {
    const { data, error } = await supabase
      .from(this.questionTable)
      .select('*')
      .eq('created_by', facilitatorId)
      .order('status', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(this.mapQuestion);
  }

  /**
   * Create a new question (facilitator adds custom question)
   */
  async createQuestion(input: CreateQuestionInput): Promise<ApplicationQuestion> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Validate options for select/multiselect types
    if ((input.questionType === 'select' || input.questionType === 'multiselect') && (!input.options || input.options.length < 2)) {
      throw new Error('Multiple choice and checkbox questions require at least 2 options');
    }

    const insertData: any = {
      question_text: input.questionText,
      category: input.category || null,
      question_type: input.questionType || 'text',
      options: input.options ? JSON.stringify(input.options) : null,
      status: input.status || 'pending',
      created_by: user.id
    };

    const { data, error } = await supabase
      .from(this.questionTable)
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return this.mapQuestion(data);
  }

  /**
   * Update question status (admin approves/rejects)
   */
  async updateQuestionStatus(
    questionId: string,
    input: UpdateQuestionStatusInput
  ): Promise<ApplicationQuestion> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const updateData: any = {
      status: input.status,
      rejection_reason: input.rejectionReason || null
    };

    if (input.status === 'approved') {
      updateData.approved_at = new Date().toISOString();
      updateData.approved_by = user.id;
    }

    const { data, error } = await supabase
      .from(this.questionTable)
      .update(updateData)
      .eq('id', questionId)
      .select()
      .single();

    if (error) throw error;

    return this.mapQuestion(data);
  }

  /**
   * Update question (facilitator can edit their pending questions)
   */
  async updateQuestion(
    questionId: string,
    input: Partial<CreateQuestionInput>
  ): Promise<ApplicationQuestion> {
    const updateData: any = {};

    if (input.questionText !== undefined) updateData.question_text = input.questionText;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.questionType !== undefined) updateData.question_type = input.questionType;
    if (input.options !== undefined) updateData.options = input.options ? JSON.stringify(input.options) : null;

    const { data, error } = await supabase
      .from(this.questionTable)
      .update(updateData)
      .eq('id', questionId)
      .select()
      .single();

    if (error) throw error;

    return this.mapQuestion(data);
  }

  /**
   * Delete question (only pending questions can be deleted by creator)
   */
  async deleteQuestion(questionId: string): Promise<void> {
    const { error } = await supabase
      .from(this.questionTable)
      .delete()
      .eq('id', questionId);

    if (error) throw error;
  }

  // =====================================================
  // OPPORTUNITY QUESTIONS OPERATIONS
  // =====================================================

  /**
   * Get questions for a specific opportunity
   */
  async getOpportunityQuestions(opportunityId: string): Promise<OpportunityQuestion[]> {
    const { data, error } = await supabase
      .from(this.opportunityQuestionsTable)
      .select(`
        *,
        question:application_question_bank(*)
      `)
      .eq('opportunity_id', opportunityId)
      .order('display_order', { ascending: true });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      opportunityId: row.opportunity_id,
      questionId: row.question_id,
      isRequired: row.is_required,
      displayOrder: row.display_order,
      question: row.question ? this.mapQuestion(row.question) : undefined
    }));
  }

  /**
   * Add questions to an opportunity
   */
  async addQuestionsToOpportunity(
    opportunityId: string,
    questionIds: string[],
    isRequired: boolean = true
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get current max display order
    const { data: existing } = await supabase
      .from(this.opportunityQuestionsTable)
      .select('display_order')
      .eq('opportunity_id', opportunityId)
      .order('display_order', { ascending: false })
      .limit(1);

    let nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

    const inserts = questionIds.map((questionId, index) => ({
      opportunity_id: opportunityId,
      question_id: questionId,
      is_required: isRequired,
      display_order: nextOrder + index
    }));

    const { error } = await supabase
      .from(this.opportunityQuestionsTable)
      .insert(inserts);

    if (error) throw error;
  }

  /**
   * Remove question from opportunity
   */
  async removeQuestionFromOpportunity(opportunityId: string, questionId: string): Promise<void> {
    const { error } = await supabase
      .from(this.opportunityQuestionsTable)
      .delete()
      .eq('opportunity_id', opportunityId)
      .eq('question_id', questionId);

    if (error) throw error;
  }

  /**
   * Update question order in opportunity
   */
  async updateQuestionOrder(
    opportunityId: string,
    questionOrders: { questionId: string; displayOrder: number }[]
  ): Promise<void> {
    const updates = questionOrders.map(({ questionId, displayOrder }) =>
      supabase
        .from(this.opportunityQuestionsTable)
        .update({ display_order: displayOrder })
        .eq('opportunity_id', opportunityId)
        .eq('question_id', questionId)
    );

    await Promise.all(updates);
  }

  // =====================================================
  // STARTUP ANSWERS OPERATIONS
  // =====================================================

  /**
   * Get all answers for a startup (for reference draft)
   */
  async getStartupAnswers(startupId: number): Promise<StartupAnswer[]> {
    const { data, error } = await supabase
      .from(this.startupAnswersTable)
      .select(`
        *,
        question:application_question_bank(*)
      `)
      .eq('startup_id', startupId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      startupId: row.startup_id,
      questionId: row.question_id,
      answerText: row.answer_text,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      question: row.question ? this.mapQuestion(row.question) : undefined
    }));
  }

  /**
   * Get answer for a specific question (if exists)
   */
  async getStartupAnswer(startupId: number, questionId: string): Promise<StartupAnswer | null> {
    const { data, error } = await supabase
      .from(this.startupAnswersTable)
      .select(`
        *,
        question:application_question_bank(*)
      `)
      .eq('startup_id', startupId)
      .eq('question_id', questionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return {
      id: data.id,
      startupId: data.startup_id,
      questionId: data.question_id,
      answerText: data.answer_text,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      question: data.question ? this.mapQuestion(data.question) : undefined
    };
  }

  /**
   * Save or update startup answer
   */
  async saveStartupAnswer(
    startupId: number,
    questionId: string,
    answerText: string
  ): Promise<StartupAnswer> {
    const { data, error } = await supabase
      .from(this.startupAnswersTable)
      .upsert({
        startup_id: startupId,
        question_id: questionId,
        answer_text: answerText,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'startup_id,question_id'
      })
      .select(`
        *,
        question:application_question_bank(*)
      `)
      .single();

    if (error) throw error;

    const row = data;
    return {
      id: row.id,
      startupId: row.startup_id,
      questionId: row.question_id,
      answerText: row.answer_text,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      question: row.question ? this.mapQuestion(row.question) : undefined
    };
  }

  /**
   * Delete startup answer
   */
  async deleteStartupAnswer(startupId: number, questionId: string): Promise<void> {
    const { error } = await supabase
      .from(this.startupAnswersTable)
      .delete()
      .eq('startup_id', startupId)
      .eq('question_id', questionId);

    if (error) throw error;
  }

  // =====================================================
  // APPLICATION RESPONSES OPERATIONS
  // =====================================================

  /**
   * Save application responses (when startup submits application)
   */
  async saveApplicationResponses(
    applicationId: string,
    responses: { questionId: string; answerText: string }[]
  ): Promise<void> {
    const inserts = responses.map(({ questionId, answerText }) => ({
      application_id: applicationId,
      question_id: questionId,
      answer_text: answerText
    }));

    const { error } = await supabase
      .from(this.applicationResponsesTable)
      .insert(inserts);

    if (error) throw error;
  }

  /**
   * Get responses for an application
   */
  async getApplicationResponses(applicationId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from(this.applicationResponsesTable)
      .select(`
        *,
        question:application_question_bank(*)
      `)
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      applicationId: row.application_id,
      questionId: row.question_id,
      answerText: row.answer_text,
      createdAt: row.created_at,
      question: row.question ? this.mapQuestion(row.question) : undefined
    }));
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private mapQuestion(row: any): ApplicationQuestion {
    return {
      id: row.id,
      questionText: row.question_text,
      category: row.category,
      questionType: row.question_type || 'text',
      options: row.options ? (typeof row.options === 'string' ? JSON.parse(row.options) : row.options) : null,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      approvedAt: row.approved_at,
      approvedBy: row.approved_by,
      rejectionReason: row.rejection_reason,
      usageCount: row.usage_count || 0,
      updatedAt: row.updated_at
    };
  }

  /**
   * Get all categories from approved questions
   */
  async getCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from(this.questionTable)
      .select('category')
      .eq('status', 'approved')
      .not('category', 'is', null);

    if (error) throw error;

    const categories = new Set<string>();
    (data || []).forEach((row: any) => {
      if (row.category) categories.add(row.category);
    });

    return Array.from(categories).sort();
  }
}

export const questionBankService = new QuestionBankService();

