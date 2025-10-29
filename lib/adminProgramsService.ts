import { supabase } from './supabase';

export interface AdminProgramPost {
  id: string;
  programName: string;
  incubationCenter: string;
  deadline: string; // ISO date string (YYYY-MM-DD)
  applicationLink: string;
  posterUrl?: string;
  createdAt: string;
  createdBy?: string | number | null;
}

export interface CreateAdminProgramPostInput {
  programName: string;
  incubationCenter: string;
  deadline: string; // YYYY-MM-DD
  applicationLink: string;
  posterUrl?: string;
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

    if (post.posterUrl && post.posterUrl.trim().length > 0) {
      baseInsert.poster_url = post.posterUrl.trim();
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
      .select('id, program_name, incubation_center, deadline, application_link, poster_url, created_at, created_by')
      .order('created_at', { ascending: false });

    // If schema cache complains about poster_url, retry without it
    if (error && String(error.message || '').toLowerCase().includes('poster_url')) {
      const retry = await supabase
        .from(this.table)
        .select('id, program_name, incubation_center, deadline, application_link, created_at, created_by')
        .order('created_at', { ascending: false });
      data = retry.data as any;
      error = retry.error as any;
    }

    if (error) throw error;

    return (data || []).map(this.mapRow);
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
    posterUrl: row.poster_url || undefined,
    createdAt: row.created_at,
    createdBy: row.created_by ?? null
  });
}

export const adminProgramsService = new AdminProgramsService();

