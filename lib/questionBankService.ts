import { supabase } from './supabase';

export interface ApplicationQuestion {
  id: string;
  questionText: string;
  category: string | null;
  questionType: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect';
  options: string[] | null;
  status: 'approved' | 'pending' | 'rejected';
  scope?: 'global' | 'facilitator' | 'opportunity' | null;
  scopeOpportunityId?: string | null;
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
  scope?: 'global' | 'facilitator' | 'opportunity';
  scopeOpportunityId?: string | null;
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
  selectionType?: 'single' | 'multiple' | null; // Override for select/multiselect questions
  question?: ApplicationQuestion;
}

class QuestionBankService {
  private questionTable = 'application_question_bank';
  private opportunityQuestionsTable = 'incubation_opportunity_questions';
  private form2QuestionsTable = 'incubation_opportunity_form2_questions';
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
      .or('scope.is.null,scope.eq.global')
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
  async getFacilitatorQuestions(facilitatorId: string, opportunityId?: string | null): Promise<ApplicationQuestion[]> {
    let query = supabase
      .from(this.questionTable)
      .select('*')
      .eq('created_by', facilitatorId)
      .order('status', { ascending: true })
      .order('created_at', { ascending: false });

    const isUuid = (value: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

    if (opportunityId && isUuid(opportunityId)) {
      const safeOpportunityId = opportunityId.replace(/"/g, '\\"');
      query = query.or(
        `scope.is.null,scope.eq.facilitator,and(scope.eq.opportunity,scope_opportunity_id.eq.\"${safeOpportunityId}\")`
      );
    } else {
      query = query.or('scope.is.null,scope.eq.facilitator');
    }

    const { data, error } = await query;

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
      created_by: user.id,
      scope: input.scope || 'facilitator',
      scope_opportunity_id: input.scopeOpportunityId || null
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
      selectionType: row.selection_type || null,
      question: row.question ? this.mapQuestion(row.question) : undefined
    }));
  }

  /**
   * Get Form 2 questions for a specific opportunity
   */
  async getForm2Questions(opportunityId: string): Promise<OpportunityQuestion[]> {
    const { data, error } = await supabase
      .from(this.form2QuestionsTable)
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
      selectionType: row.selection_type || null,
      question: row.question ? this.mapQuestion(row.question) : undefined
    }));
  }

  /**
   * Add questions to an opportunity
   */
  async addQuestionsToOpportunity(
    opportunityId: string,
    questionIds: string[],
    questionRequiredMap?: Map<string, boolean> | boolean,
    questionSelectionTypeMap?: Map<string, 'single' | 'multiple' | null>
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

    const inserts = questionIds.map((questionId, index) => {
      // Determine is_required
      let isRequired = true;
      if (questionRequiredMap instanceof Map) {
        isRequired = questionRequiredMap.get(questionId) !== false; // Default to true
      } else if (typeof questionRequiredMap === 'boolean') {
        isRequired = questionRequiredMap;
      }

      // Determine selection_type (only for questions with options)
      const selectionType = questionSelectionTypeMap?.get(questionId) || null;

      return {
        opportunity_id: opportunityId,
        question_id: questionId,
        is_required: isRequired,
        selection_type: selectionType,
        display_order: nextOrder + index
      };
    });

    const { error } = await supabase
      .from(this.opportunityQuestionsTable)
      .insert(inserts);

    if (error) throw error;
  }

  /**
   * Add questions to Form 2 for an opportunity
   */
  async addQuestionsToForm2(
    opportunityId: string,
    questionIds: string[],
    questionRequiredMap?: Map<string, boolean> | boolean,
    questionSelectionTypeMap?: Map<string, 'single' | 'multiple' | null>
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get current max display order
    const { data: existing } = await supabase
      .from(this.form2QuestionsTable)
      .select('display_order')
      .eq('opportunity_id', opportunityId)
      .order('display_order', { ascending: false })
      .limit(1);

    let nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

    const inserts = questionIds.map((questionId, index) => {
      let isRequired = true;
      if (questionRequiredMap instanceof Map) {
        isRequired = questionRequiredMap.get(questionId) !== false;
      } else if (typeof questionRequiredMap === 'boolean') {
        isRequired = questionRequiredMap;
      }

      const selectionType = questionSelectionTypeMap?.get(questionId) || null;

      return {
        opportunity_id: opportunityId,
        question_id: questionId,
        is_required: isRequired,
        selection_type: selectionType,
        display_order: nextOrder + index
      };
    });

    const { error } = await supabase
      .from(this.form2QuestionsTable)
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
   * Remove question from Form 2
   */
  async removeQuestionFromForm2(opportunityId: string, questionId: string): Promise<void> {
    const { error } = await supabase
      .from(this.form2QuestionsTable)
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
      scope: row.scope || null,
      scopeOpportunityId: row.scope_opportunity_id || null,
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

  /**
   * Get predefined question categories from database
   */
  async getPredefinedCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('question_categories')
      .select('name')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      // If table doesn't exist yet, return empty array (graceful fallback)
      console.warn('question_categories table may not exist:', error);
      return [];
    }

    return (data || []).map((row: any) => row.name);
  }

  // =====================================================
  // TRACK MY STARTUP PROGRAM QUESTIONS
  // =====================================================

  /**
   * Get questions configured for a specific program in Track My Startup
   */
  async getProgramTrackingQuestions(facilitatorId: string, programName: string): Promise<OpportunityQuestion[]> {
    // DEBUG: Log the filter parameters
    console.log(`🔍 DATABASE QUERY: incubation_program_questions WHERE facilitator_id="${facilitatorId}" AND program_name="${programName}"`);

    const { data, error } = await supabase
      .from('incubation_program_questions')
      .select(`
        id,
        question_id,
        is_required,
        display_order,
        selection_type
      `)
      .eq('facilitator_id', facilitatorId)
      .eq('program_name', programName)
      .order('display_order', { ascending: true });

    // DEBUG: Log the query result
    if (error) {
      console.log(`❌ DATABASE ERROR: ${error.message}`);
    } else {
      console.log(`✅ DATABASE RETURNED ${data?.length || 0} rows`);
    }

    if (error) throw error;

    // If we got questions, fetch the question details separately
    if (data && data.length > 0) {
      const questionIds = data.map(row => row.question_id);
      const { data: questionData, error: questionError } = await supabase
        .from('application_question_bank')
        .select('*')
        .in('id', questionIds);

      if (questionError) {
        console.log(`❌ QUESTION DATA ERROR: ${questionError.message}`);
      } else {
        console.log(`✅ FETCHED ${questionData?.length || 0} question details`);
      }

      // Map questions for lookup
      const questionMap = new Map(questionData?.map((q: any) => [q.id, q]) || []);

      return data.map((row: any) => ({
        id: row.id,
        opportunityId: '', // Not used for program tracking
        questionId: row.question_id,
        isRequired: row.is_required,
        displayOrder: row.display_order,
        selectionType: row.selection_type || null,
        question: questionMap.get(row.question_id) ? this.mapQuestion(questionMap.get(row.question_id)) : undefined
      }));
    }

    return [];
  }

  /**
   * Add questions to a Track My Startup program
   */
  async addQuestionsToProgram(
    facilitatorId: string,
    programName: string,
    questionIds: string[],
    questionRequiredMap?: Map<string, boolean> | boolean,
    questionSelectionTypeMap?: Map<string, 'single' | 'multiple' | null>
  ): Promise<{ added: number; skipped: number; total: number }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log(`🔍 Checking existing questions for program: ${programName}`);

      // STEP 1: Get existing question IDs for this program
      const { data: existingQuestions, error: existingError } = await supabase
        .from('incubation_program_questions')
        .select('question_id')
        .eq('facilitator_id', facilitatorId)
        .eq('program_name', programName);

      if (existingError) throw existingError;

      const existingQuestionIds = new Set(existingQuestions?.map(q => q.question_id) || []);
      console.log(`📋 Found ${existingQuestionIds.size} existing questions in program`);

      // STEP 2: Filter out questions that already exist (no duplicates)
      const newQuestionIds = questionIds.filter(qId => !existingQuestionIds.has(qId));
      const skippedCount = questionIds.length - newQuestionIds.length;

      console.log(`✓ New questions to add: ${newQuestionIds.length}, Skipped (already exist): ${skippedCount}`);

      // STEP 3: If no new questions, return early
      if (newQuestionIds.length === 0) {
        console.log('ℹ️ All selected questions already configured in this program');
        return { added: 0, skipped: skippedCount, total: questionIds.length };
      }

      // STEP 4: Get current max display order
      const { data: existing } = await supabase
        .from('incubation_program_questions')
        .select('display_order')
        .eq('facilitator_id', facilitatorId)
        .eq('program_name', programName)
        .order('display_order', { ascending: false })
        .limit(1);

      let nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

      // STEP 5: Prepare insert data for only NEW questions
      const inserts = newQuestionIds.map((questionId, index) => {
        let isRequired = true;

        if (questionRequiredMap instanceof Map) {
          isRequired = questionRequiredMap.get(questionId) !== false;
        } else if (typeof questionRequiredMap === 'boolean') {
          isRequired = questionRequiredMap;
        }

        const selectionType = questionSelectionTypeMap?.get(questionId) || null;

        return {
          facilitator_id: facilitatorId,
          program_name: programName,
          question_id: questionId,
          is_required: isRequired,
          selection_type: selectionType,
          display_order: nextOrder + index
        };
      });

      // STEP 6: Insert only the new questions
      const { error: insertError } = await supabase
        .from('incubation_program_questions')
        .insert(inserts);

      if (insertError) throw insertError;

      console.log(`✅ Added ${newQuestionIds.length} new questions to program`);
      console.log(`📊 Total in program now: ${existingQuestionIds.size + newQuestionIds.length} questions`);

      return { 
        added: newQuestionIds.length, 
        skipped: skippedCount, 
        total: questionIds.length 
      };
    } catch (error) {
      console.error('❌ Error adding questions to program:', error);
      throw error;
    }
  }

  /**
   * Remove all questions from a Track My Startup program
   */
  async removeProgramQuestions(facilitatorId: string, programName: string): Promise<void> {
    const { error } = await supabase
      .from('incubation_program_questions')
      .delete()
      .eq('facilitator_id', facilitatorId)
      .eq('program_name', programName);

    if (error) throw error;
  }

  /**
   * Update question order in a Track My Startup program
   */
  async updateProgramQuestionOrder(questionId: string, newOrder: number): Promise<void> {
    const { error } = await supabase
      .from('incubation_program_questions')
      .update({ display_order: newOrder })
      .eq('id', questionId);

    if (error) throw error;
  }

  /**
   * Update question required status in a Track My Startup program
   */
  async updateProgramQuestionRequired(questionId: string, isRequired: boolean): Promise<void> {
    const { error } = await supabase
      .from('incubation_program_questions')
      .update({ is_required: isRequired })
      .eq('id', questionId);

    if (error) throw error;
  }

  /**
   * Update question selection type in a Track My Startup program
   */
  async updateProgramQuestionSelectionType(questionId: string, selectionType: 'single' | 'multiple' | null): Promise<void> {
    const { error } = await supabase
      .from('incubation_program_questions')
      .update({ selection_type: selectionType })
      .eq('id', questionId);

    if (error) throw error;
  }

  /**
   * Remove a single question from a Track My Startup program
   */
  async removeProgramQuestion(facilitatorId: string, programName: string, questionId: string): Promise<void> {
    const { error } = await supabase
      .from('incubation_program_questions')
      .delete()
      .eq('facilitator_id', facilitatorId)
      .eq('program_name', programName)
      .eq('question_id', questionId);

    if (error) throw error;
  }

  /**
   * Save or update startup's response to a program tracking question
   */
  async saveProgramTrackingResponse(
    startupId: number,
    facilitatorId: string,
    programName: string,
    questionId: string,
    answerText: string
  ): Promise<void> {
    const { error } = await supabase
      .from('program_tracking_responses')
      .upsert({
        startup_id: startupId,
        facilitator_id: facilitatorId,
        program_name: programName,
        question_id: questionId,
        answer_text: answerText
      }, {
        onConflict: 'startup_id,facilitator_id,program_name,question_id'
      });

    if (error) throw error;
  }

  /**
   * Get startup's responses for a specific program
   */
  async getProgramTrackingResponses(
    startupId: number,
    facilitatorId: string,
    programName: string
  ): Promise<Array<{ questionId: string; answerText: string; question?: ApplicationQuestion }>> {
    const { data, error } = await supabase
      .from('program_tracking_responses')
      .select(`
        question_id,
        answer_text,
        question:application_question_bank(*)
      `)
      .eq('startup_id', startupId)
      .eq('facilitator_id', facilitatorId)
      .eq('program_name', programName);

    if (error) throw error;

    return (data || []).map((row: any) => ({
      questionId: row.question_id,
      answerText: row.answer_text,
      question: row.question ? this.mapQuestion(row.question) : undefined
    }));
  }

  /**
   * Get all responses for a facilitator's program (for viewing all startups' responses)
   */
  async getAllProgramTrackingResponses(
    facilitatorId: string,
    programName: string
  ): Promise<Array<{ 
    startupId: number; 
    questionId: string; 
    answerText: string; 
    question?: ApplicationQuestion;
    createdAt: string;
    updatedAt: string;
  }>> {
    const { data, error } = await supabase
      .from('program_tracking_responses')
      .select(`
        startup_id,
        question_id,
        answer_text,
        created_at,
        updated_at,
        question:application_question_bank(*)
      `)
      .eq('facilitator_id', facilitatorId)
      .eq('program_name', programName)
      .order('startup_id', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      startupId: row.startup_id,
      questionId: row.question_id,
      answerText: row.answer_text,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      question: row.question ? this.mapQuestion(row.question) : undefined
      }));
    }
  
    /**
     * Remove a single question from a program
     */
    async removeQuestionFromProgram(
      facilitatorId: string,
      programName: string,
      questionId: string
    ): Promise<void> {
      const { error } = await supabase
        .from('incubation_program_questions')
        .delete()
        .eq('facilitator_id', facilitatorId)
        .eq('program_name', programName)
        .eq('question_id', questionId);
  
      if (error) throw error;
    }
  }
  
  export const questionBankService = new QuestionBankService();

