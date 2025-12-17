import { supabase } from './supabase';

export interface AdminProgramPost {
  id: string;
  programName: string;
  incubationCenter: string;
  deadline: string; // ISO date string (YYYY-MM-DD)
  applicationLink: string;
  description?: string;
  posterUrl?: string;
  grantAmount?: number;
  country?: string[];
  domain?: string[];
  stage?: string[];
  rounds?: string[];
  createdAt: string;
  createdBy?: string | number | null;
}

export interface CreateAdminProgramPostInput {
  programName: string;
  incubationCenter: string;
  deadline: string; // YYYY-MM-DD
  applicationLink: string;
  description?: string;
  posterUrl?: string;
  grantAmount?: number;
  country?: string[];
  domain?: string[];
  stage?: string[];
  rounds?: string[];
}

class AdminProgramsService {
  private table = 'admin_program_posts';

  async create(post: CreateAdminProgramPostInput): Promise<AdminProgramPost> {
    // Build insert object dynamically to avoid sending unknown columns
    const baseInsert: any = {
      program_name: post.programName,
      incubation_center: post.incubationCenter,
      deadline: post.deadline,
      application_link: post.applicationLink
    };

    if (post.description && post.description.trim().length > 0) {
      baseInsert.description = post.description.trim();
    }

    if (post.posterUrl && post.posterUrl.trim().length > 0) {
      baseInsert.poster_url = post.posterUrl.trim();
    }

    if (post.grantAmount !== undefined && post.grantAmount !== null) {
      baseInsert.grant_amount = post.grantAmount;
    }

    if (post.country && post.country.length > 0) {
      baseInsert.country = post.country;
    }

    if (post.domain && post.domain.length > 0) {
      baseInsert.domain = post.domain;
    }

    if (post.stage && post.stage.length > 0) {
      baseInsert.stage = post.stage;
    }

    if (post.rounds && post.rounds.length > 0) {
      baseInsert.rounds = post.rounds;
    }

    let { data, error } = await supabase
      .from(this.table)
      .insert(baseInsert)
      .select()
      .single();

    // If schema cache complains about poster_url, retry without it
    if (error && String(error.message || '').toLowerCase().includes("poster_url")) {
      // Remove poster_url and retry once
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete baseInsert.poster_url;
      const retry = await supabase
        .from(this.table)
        .insert(baseInsert)
        .select()
        .single();
      data = retry.data as any;
      error = retry.error as any;
    }

    if (error) throw error;

    return this.mapRow(data);
  }

  async listActive(): Promise<AdminProgramPost[]> {
    // Prefer explicit column list for better compatibility with schema cache
    let { data, error } = await supabase
      .from(this.table)
      .select('id, program_name, incubation_center, deadline, application_link, description, poster_url, grant_amount, country, domain, stage, rounds, created_at, created_by')
      .order('created_at', { ascending: false });

    // If schema cache complains about new columns, retry with minimal columns
    if (error && (String(error.message || '').toLowerCase().includes('poster_url') || 
                  String(error.message || '').toLowerCase().includes('grant_amount') ||
                  String(error.message || '').toLowerCase().includes('country') ||
                  String(error.message || '').toLowerCase().includes('domain') ||
                  String(error.message || '').toLowerCase().includes('stage') ||
                  String(error.message || '').toLowerCase().includes('rounds'))) {
      const retry = await supabase
        .from(this.table)
        .select('id, program_name, incubation_center, deadline, application_link, description, created_at, created_by')
        .order('created_at', { ascending: false });
      data = retry.data as any;
      error = retry.error as any;
    }

    if (error) throw error;

    return (data || []).map(this.mapRow);
  }

  async update(id: string, post: CreateAdminProgramPostInput): Promise<AdminProgramPost> {
    // Build update object dynamically to avoid sending unknown columns
    const baseUpdate: any = {
      program_name: post.programName,
      incubation_center: post.incubationCenter,
      deadline: post.deadline,
      application_link: post.applicationLink
    };

    if (post.description && post.description.trim().length > 0) {
      baseUpdate.description = post.description.trim();
    } else {
      baseUpdate.description = null;
    }

    if (post.posterUrl && post.posterUrl.trim().length > 0) {
      baseUpdate.poster_url = post.posterUrl.trim();
    } else {
      baseUpdate.poster_url = null;
    }

    if (post.grantAmount !== undefined && post.grantAmount !== null) {
      baseUpdate.grant_amount = post.grantAmount;
    } else {
      baseUpdate.grant_amount = null;
    }

    if (post.country && post.country.length > 0) {
      baseUpdate.country = post.country;
    } else {
      baseUpdate.country = null;
    }

    if (post.domain && post.domain.length > 0) {
      baseUpdate.domain = post.domain;
    } else {
      baseUpdate.domain = null;
    }

    if (post.stage && post.stage.length > 0) {
      baseUpdate.stage = post.stage;
    } else {
      baseUpdate.stage = null;
    }

    if (post.rounds && post.rounds.length > 0) {
      baseUpdate.rounds = post.rounds;
    } else {
      baseUpdate.rounds = null;
    }

    const { data, error } = await supabase
      .from(this.table)
      .update(baseUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return this.mapRow(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.table)
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  private mapRow = (row: any): AdminProgramPost => ({
    id: row.id,
    programName: row.program_name,
    incubationCenter: row.incubation_center,
    deadline: row.deadline,
    applicationLink: row.application_link,
    description: row.description || undefined,
    posterUrl: row.poster_url || undefined,
    grantAmount: row.grant_amount !== null && row.grant_amount !== undefined ? parseFloat(row.grant_amount) : undefined,
    country: Array.isArray(row.country) ? row.country : (row.country ? [row.country] : undefined),
    domain: Array.isArray(row.domain) ? row.domain : (row.domain ? [row.domain] : undefined),
    stage: Array.isArray(row.stage) ? row.stage : (row.stage ? [row.stage] : undefined),
    rounds: Array.isArray(row.rounds) ? row.rounds : (row.rounds ? [row.rounds] : undefined),
    createdAt: row.created_at,
    createdBy: row.created_by ?? null
  });
}

export const adminProgramsService = new AdminProgramsService();

