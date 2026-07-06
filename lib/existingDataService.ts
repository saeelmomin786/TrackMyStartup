import { supabase } from './supabase';

export const EXISTING_DATA_PROGRAM = '__existing_data__';

export interface ExistingStartup {
  responseId: string;
  startupName: string;
  email: string;
  data: Record<string, string | Record<string, string>>; // question_bank_id → answer or {year → answer}
  uploadedAt: string;
  assignedProgram: string | null;
}

export interface TemplateQuestion {
  id: string;
  question_text: string;
  multipleResponses: boolean; // true = one column per year
}

export interface TemplateConfig {
  fromYear: number;
  toYear: number;
  questions: TemplateQuestion[];
}

export interface UploadResult {
  uploaded: number;
  skipped: number;
  errors: string[];
}

interface QuestionBankRow {
  id: string;
  question_text: string;
  category: string | null;
  question_type: string;
  options?: string[] | null;
}

class ExistingDataService {
  // ── helpers ────────────────────────────────────────────────────────────────

  // The reports table RLS requires user_profiles.id as facilitator_id (not auth.uid()).
  // FacilitatorView passes the auth user ID, so we resolve it once here.
  private async resolveProfileId(authUserId: string): Promise<string | null> {
    const { data } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();
    return data?.id ?? null;
  }

  private async fetchApprovedQuestions(): Promise<QuestionBankRow[]> {
    const { data, error } = await supabase
      .from('application_question_bank')
      .select('id, question_text, category, question_type, options')
      .eq('status', 'approved')
      .order('category', { ascending: true })
      .order('usage_count', { ascending: false });

    if (error) {
      console.error('Error fetching question bank:', error);
      return [];
    }
    return data || [];
  }

  // Get or create the special "Existing Data" report for a facilitator.
  // Each call also syncs report_questions against the current question bank
  // so new questions are always included.
  async getOrCreateExistingDataReport(authUserId: string): Promise<string | null> {
    // Resolve auth user ID → user_profiles.id (required by reports RLS)
    const facilitatorId = await this.resolveProfileId(authUserId);
    if (!facilitatorId) {
      console.error('Could not resolve profile ID for auth user:', authUserId);
      return null;
    }

    // Find or create the parent report record
    let reportId: string;

    const { data: existing } = await supabase
      .from('reports')
      .select('id')
      .eq('facilitator_id', facilitatorId)
      .eq('program_name', EXISTING_DATA_PROGRAM)
      .maybeSingle();

    if (existing?.id) {
      reportId = existing.id;
    } else {
      const year = new Date().getFullYear().toString();
      const { data: created, error } = await supabase
        .from('reports')
        .insert({
          facilitator_id: facilitatorId,
          title: 'Existing Startup Data',
          program_name: EXISTING_DATA_PROGRAM,
          report_year: year,
        })
        .select('id')
        .single();

      if (error || !created) {
        console.error('Error creating existing data report:', error);
        return null;
      }
      reportId = created.id;
    }

    // Sync report_questions with question bank
    // pool_question_id stores the application_question_bank.id
    const [bankQuestions, { data: existingQuestions }] = await Promise.all([
      this.fetchApprovedQuestions(),
      supabase
        .from('report_questions')
        .select('pool_question_id')
        .eq('report_id', reportId),
    ]);

    const alreadySynced = new Set(
      (existingQuestions || []).map((q: any) => q.pool_question_id)
    );

    const toInsert = bankQuestions
      .filter(q => !alreadySynced.has(q.id))
      .map((q, idx) => ({
        report_id: reportId,
        question_text: q.question_text,
        question_type: q.question_type || 'text',
        options: q.options ? JSON.stringify(q.options) : null,
        is_from_pool: true,
        pool_question_id: q.id, // ← links back to application_question_bank.id
        position: (existingQuestions?.length || 0) + idx,
      }));

    if (toInsert.length > 0) {
      await supabase.from('report_questions').insert(toInsert);
    }

    return reportId;
  }

  // Map question_text (CSV header) → report_question.id
  // Also includes the reverse: pool_question_id → report_question.id
  private async buildHeaderToQuestionIdMap(
    reportId: string,
    bankQuestions: QuestionBankRow[]
  ): Promise<{ byText: Map<string, string>; byBankId: Map<string, string> }> {
    const { data: rqs } = await supabase
      .from('report_questions')
      .select('id, question_text, pool_question_id')
      .eq('report_id', reportId);

    const byText = new Map<string, string>();   // question_text → report_question.id
    const byBankId = new Map<string, string>(); // pool_question_id → report_question.id

    (rqs || []).forEach((rq: any) => {
      byText.set(rq.question_text.trim().toLowerCase(), rq.id);
      if (rq.pool_question_id) byBankId.set(rq.pool_question_id, rq.id);
    });

    return { byText, byBankId };
  }

  // ── CSV parsing ────────────────────────────────────────────────────────────

  parseCSV(csvText: string): Array<Record<string, string>> {
    const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    if (lines.length < 2) return [];

    // Strip BOM
    const rawHeader = lines[0].startsWith('﻿') ? lines[0].slice(1) : lines[0];

    // Parse headers (strip asterisks and trim)
    const headers = this.splitCSVLine(rawHeader).map(h =>
      h.replace(/^\*|\*$/g, '').trim()
    );

    const rows: Array<Record<string, string>> = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = this.splitCSVLine(line);
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      rows.push(row);
    }
    return rows;
  }

  private splitCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim());
    return values;
  }

  private escapeCSV(val: string): string {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }

  // ── Template download ──────────────────────────────────────────────────────

  // Legacy: download all questions with no year columns
  async downloadTemplate(): Promise<void> {
    const questions = await this.fetchApprovedQuestions();
    const config: TemplateConfig = {
      fromYear: new Date().getFullYear(),
      toYear: new Date().getFullYear(),
      questions: questions.map(q => ({ id: q.id, question_text: q.question_text, multipleResponses: false })),
    };
    this.generateAndDownloadTemplate(config);
  }

  // Generate template CSV based on user-provided config
  generateAndDownloadTemplate(config: TemplateConfig): void {
    const years: number[] = [];
    for (let y = config.fromYear; y <= config.toYear; y++) years.push(y);

    const headers: string[] = ['Startup Name*', 'Email*'];
    for (const q of config.questions) {
      if (q.multipleResponses && years.length > 0) {
        for (const yr of years) {
          headers.push(this.escapeCSV(`${q.question_text} (${yr})`));
        }
      } else {
        headers.push(this.escapeCSV(q.question_text));
      }
    }

    const sampleRow = ['My Startup Inc.', 'founder@mystartup.com', ...headers.slice(2).map(() => '')];

    const csv = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'startup_data_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ── Upload CSV rows ────────────────────────────────────────────────────────

  // Detect "Question Text (YYYY)" pattern → returns { baseText, year } or null
  private parseYearHeader(header: string): { baseText: string; year: string } | null {
    const m = header.match(/^(.+?)\s*\((\d{4})\)\s*$/);
    if (!m) return null;
    return { baseText: m[1].trim(), year: m[2] };
  }

  async uploadCSVData(
    facilitatorId: string,
    rows: Array<Record<string, string>>
  ): Promise<UploadResult> {
    const reportId = await this.getOrCreateExistingDataReport(facilitatorId);
    if (!reportId) return { uploaded: 0, skipped: 0, errors: ['Failed to initialise storage'] };

    const bankQuestions = await this.fetchApprovedQuestions();
    const { byText } = await this.buildHeaderToQuestionIdMap(reportId, bankQuestions);

    let uploaded = 0;
    let skipped = 0;
    const errors: string[] = [];
    const now = new Date().toISOString();

    for (const row of rows) {
      const name = (row['Startup Name'] || row['startup_name'] || row['startup name'] || '').trim();
      const email = (row['Email'] || row['email'] || '').trim();

      if (!name || !email) {
        skipped++;
        if (errors.length < 5) errors.push(`Row skipped — missing Startup Name or Email`);
        continue;
      }

      // Upsert response — email is used as startup_id for future account linking
      const { data: response, error: resErr } = await supabase
        .from('report_responses')
        .upsert(
          {
            report_id: reportId,
            startup_id: email,
            startup_name: name,
            status: 'submitted',
            submitted_at: now,
          },
          { onConflict: 'report_id,startup_id' }
        )
        .select('id')
        .single();

      if (resErr || !response) {
        errors.push(`Failed to save "${name}": ${resErr?.message}`);
        continue;
      }

      // Collect answers — group year-suffixed columns into JSON objects per question
      const yearGrouped: Map<string, Record<string, string>> = new Map(); // questionId → {year → value}
      const singleAnswers: Map<string, string> = new Map(); // questionId → value

      for (const [header, value] of Object.entries(row)) {
        const headerLower = header.toLowerCase().trim();
        if (headerLower === 'startup name' || headerLower === 'email') continue;

        const yearParsed = this.parseYearHeader(header);
        if (yearParsed) {
          const qId = byText.get(yearParsed.baseText.toLowerCase());
          if (!qId) continue;
          if (!yearGrouped.has(qId)) yearGrouped.set(qId, {});
          yearGrouped.get(qId)![yearParsed.year] = value;
        } else {
          const qId = byText.get(headerLower);
          if (!qId) continue;
          singleAnswers.set(qId, value);
        }
      }

      // Merge into upsert list
      const answersToUpsert: Array<{ response_id: string; question_id: string; answer: string }> = [];
      const historyToInsert: Array<{ response_id: string; question_id: string; answer: string; submitted_at: string }> = [];

      singleAnswers.forEach((value, qId) => {
        const serialized = JSON.stringify(value);
        answersToUpsert.push({ response_id: response.id, question_id: qId, answer: serialized });
        historyToInsert.push({ response_id: response.id, question_id: qId, answer: serialized, submitted_at: now });
      });

      yearGrouped.forEach((yearMap, qId) => {
        const serialized = JSON.stringify(yearMap);
        answersToUpsert.push({ response_id: response.id, question_id: qId, answer: serialized });
        historyToInsert.push({ response_id: response.id, question_id: qId, answer: serialized, submitted_at: now });
      });

      if (answersToUpsert.length > 0) {
        await supabase
          .from('report_answers')
          .upsert(answersToUpsert, { onConflict: 'response_id,question_id' });
      }

      if (historyToInsert.length > 0) {
        await supabase.from('report_answer_history').insert(historyToInsert);
      }

      uploaded++;
    }

    return { uploaded, skipped, errors };
  }

  // ── Fetch uploaded startups ────────────────────────────────────────────────

  async getExistingStartups(authUserId: string): Promise<ExistingStartup[]> {
    // Resolve auth user ID → user_profiles.id (required by reports RLS)
    const facilitatorId = await this.resolveProfileId(authUserId);
    if (!facilitatorId) return [];

    const { data: report } = await supabase
      .from('reports')
      .select('id')
      .eq('facilitator_id', facilitatorId)
      .eq('program_name', EXISTING_DATA_PROGRAM)
      .maybeSingle();

    if (!report?.id) return [];

    // Build question_id → pool_question_id (bank ID) map for decoding answers
    const { data: rqs } = await supabase
      .from('report_questions')
      .select('id, pool_question_id, question_text')
      .eq('report_id', report.id);

    const qKeyMap = new Map<string, string>(); // report_question.id → pool_question_id
    (rqs || []).forEach((q: any) => {
      qKeyMap.set(q.id, q.pool_question_id || q.question_text);
    });

    const { data: responses } = await supabase
      .from('report_responses')
      .select(`id, startup_id, startup_name, submitted_at, assigned_program, report_answers(question_id, answer)`)
      .eq('report_id', report.id)
      .order('created_at', { ascending: false });

    return (responses || []).map((r: any) => {
      const data: Record<string, string> = {};
      (r.report_answers || []).forEach((a: any) => {
        const key = qKeyMap.get(a.question_id) || a.question_id;
        try {
          data[key] = typeof a.answer === 'string' ? JSON.parse(a.answer) : String(a.answer ?? '');
        } catch {
          data[key] = String(a.answer ?? '');
        }
      });
      return {
        responseId: r.id,
        startupName: r.startup_name,
        email: r.startup_id,
        data,
        uploadedAt: r.submitted_at || '',
        assignedProgram: r.assigned_program ?? null,
      };
    });
  }

  // ── Assign a manually-added startup to a real program ─────────────────────
  // Lets an existing-data entry be pulled into that program's "Create Report"
  // flow alongside live-tracked portfolio startups.
  async assignProgram(responseId: string, programName: string | null): Promise<boolean> {
    const { error } = await supabase
      .from('report_responses')
      .update({ assigned_program: programName })
      .eq('id', responseId);
    return !error;
  }

  // ── Report generation: year-aware answer expansion ─────────────────────────
  // A question tracked across multiple periods (e.g. "Turnover Generated") is
  // stored as a JSON object { year → value } in ExistingStartup.data (see
  // uploadCSVData's yearGrouped map). A plain single-value answer is a string.
  // Reports need one column per selected year for the former, one column for
  // the latter — this mirrors the exact structure used when the data was
  // uploaded via the year-range Template.

  // Scan every startup's data and collect every year key that appears anywhere.
  collectAvailableYears(startups: ExistingStartup[]): string[] {
    const years = new Set<string>();
    startups.forEach(s => {
      Object.values(s.data).forEach(v => {
        if (v && typeof v === 'object') {
          Object.keys(v).forEach(y => years.add(y));
        }
      });
    });
    return Array.from(years).sort();
  }

  // Expand base question ids into "questionId::year" keys for multi-year
  // questions (filtered to selectedYears), leaving single-value questions as
  // plain question ids. Returns the expanded id list (in report column order),
  // which of the base ids were multi-year, and each startup's answer map keyed
  // by the expanded ids.
  buildYearAwareResponses(
    startups: ExistingStartup[],
    baseQuestionIds: string[],
    selectedYears: string[]
  ): {
    expandedQuestionIds: string[];
    multiYearQuestionIds: string[];
    responses: Array<{ startup_id: string; startup_name: string; answers: Record<string, string> }>;
  } {
    const selectedYearSet = new Set(selectedYears);
    const yearsByQuestion = new Map<string, Set<string>>();

    baseQuestionIds.forEach(qId => {
      const years = new Set<string>();
      startups.forEach(s => {
        const v = s.data[qId];
        if (v && typeof v === 'object') Object.keys(v).forEach(y => years.add(y));
      });
      if (years.size > 0) yearsByQuestion.set(qId, years);
    });

    const expandedQuestionIds: string[] = [];
    baseQuestionIds.forEach(qId => {
      const years = yearsByQuestion.get(qId);
      if (years) {
        Array.from(years)
          .filter(y => selectedYearSet.has(y))
          .sort()
          .forEach(y => expandedQuestionIds.push(`${qId}::${y}`));
      } else {
        expandedQuestionIds.push(qId);
      }
    });

    const responses = startups.map(s => {
      const answers: Record<string, string> = {};
      expandedQuestionIds.forEach(key => {
        if (key.includes('::')) {
          const [qId, year] = key.split('::');
          const v = s.data[qId];
          answers[key] = (v && typeof v === 'object') ? (v[year] || '') : '';
        } else {
          const v = s.data[key];
          answers[key] = typeof v === 'string' ? v : '';
        }
      });
      return { startup_id: s.email, startup_name: s.startupName, answers };
    });

    return {
      expandedQuestionIds,
      multiYearQuestionIds: Array.from(yearsByQuestion.keys()),
      responses,
    };
  }

  // ── Delete a single entry ──────────────────────────────────────────────────

  async deleteExistingStartup(responseId: string): Promise<boolean> {
    const { error } = await supabase
      .from('report_responses')
      .delete()
      .eq('id', responseId);
    return !error;
  }

  // ── Send invitation to a startup ───────────────────────────────────────────
  // Creates a startup_invitations record (same table used by portfolio invites)
  // and fires an email via the send-invite edge function.
  async sendInvitation(params: {
    facilitatorId: string;
    facilitatorCode: string;
    centerName: string;
    startupName: string;
    email: string;
  }): Promise<{ success: boolean; invitationId?: string; error?: string }> {
    try {
      // 1. Upsert startup_invitations record — reuse the same table as portfolio invites
      //    Check if a record already exists first
      const { data: existing } = await supabase
        .from('startup_invitations')
        .select('id, status')
        .eq('facilitator_id', params.facilitatorId)
        .eq('email', params.email)
        .maybeSingle();

      let invitationId: string;

      if (existing?.id) {
        // Already invited — refresh the timestamp
        await supabase
          .from('startup_invitations')
          .update({ status: 'sent', invitation_sent_at: new Date().toISOString() })
          .eq('id', existing.id);
        invitationId = existing.id;
      } else {
        const { data: created, error: insertErr } = await supabase
          .from('startup_invitations')
          .insert({
            facilitator_id: params.facilitatorId,
            startup_name: params.startupName,
            contact_person: params.startupName,
            email: params.email,
            phone: '',
            facilitator_code: params.facilitatorCode,
            status: 'sent',
            invitation_sent_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (insertErr || !created) {
          return { success: false, error: insertErr?.message || 'Failed to create invitation record' };
        }
        invitationId = created.id;
      }

      // 2. Fire email via Vercel serverless function (best-effort — don't fail if email fails)
      try {
        const redirectUrl = window.location.origin;
        const response = await fetch('/api/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'facilitator-startup',
            centerName: params.centerName,
            startupName: params.startupName,
            contactEmail: params.email,
            facilitatorCode: params.facilitatorCode,
            redirectUrl,
          }),
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.warn('Invite email failed (non-fatal):', errData);
        }
      } catch (emailErr) {
        console.warn('Email send failed (non-fatal):', emailErr);
      }

      return { success: true, invitationId };
    } catch (err: any) {
      console.error('sendInvitation error:', err);
      return { success: false, error: err?.message || 'Unknown error' };
    }
  }

  // ── Fetch sent invitation emails for this facilitator ─────────────────────
  // Returns a Set of emails that have already been invited
  async getInvitedEmails(facilitatorId: string): Promise<Set<string>> {
    const { data } = await supabase
      .from('startup_invitations')
      .select('email')
      .eq('facilitator_id', facilitatorId)
      .in('status', ['sent', 'accepted']);

    const set = new Set<string>();
    (data || []).forEach((row: any) => {
      if (row.email) set.add(row.email.toLowerCase());
    });
    return set;
  }
}

export const existingDataService = new ExistingDataService();
