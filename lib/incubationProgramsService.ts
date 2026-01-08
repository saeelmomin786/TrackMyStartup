import { supabase } from './supabase';
import { IncubationProgram, AddIncubationProgramData } from '../types';

class IncubationProgramsService {
  // =====================================================
  // CRUD OPERATIONS
  // =====================================================

  async getIncubationPrograms(startupId: number): Promise<IncubationProgram[]> {
    const { data, error } = await supabase
      .from('incubation_programs')
      .select('*')
      .eq('startup_id', startupId)
      .order('start_date', { ascending: false });

    if (error) throw error;

    return (data || []).map(program => ({
      id: program.id,
      programName: program.program_name,
      programType: program.program_type as 'Incubation' | 'Acceleration' | 'Mentorship' | 'Bootcamp' | 'Grant',
      startDate: program.start_date,
      endDate: program.end_date,
      status: program.status as 'Active' | 'Completed' | 'Dropped',
      description: program.description,
      mentorName: program.mentor_name,
      mentorEmail: program.mentor_email,
      programUrl: program.program_url,
      createdAt: program.created_at
    }));
  }

  async addIncubationProgram(startupId: number, programData: AddIncubationProgramData): Promise<IncubationProgram> {
    const insertData: any = {
      startup_id: startupId,
      program_name: programData.programName,
      program_type: programData.programType,
      description: programData.description,
      mentor_name: programData.mentorName,
      mentor_email: programData.mentorEmail,
      program_url: programData.programUrl
    };
    
    // Only include dates if provided
    if (programData.startDate) {
      insertData.start_date = programData.startDate;
    }
    if (programData.endDate) {
      insertData.end_date = programData.endDate;
    }
    
    const { data, error } = await supabase
      .from('incubation_programs')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      programName: data.program_name,
      programType: data.program_type as 'Incubation' | 'Acceleration' | 'Mentorship' | 'Bootcamp' | 'Grant',
      startDate: data.start_date,
      endDate: data.end_date,
      status: data.status as 'Active' | 'Completed' | 'Dropped',
      description: data.description,
      mentorName: data.mentor_name,
      mentorEmail: data.mentor_email,
      programUrl: data.program_url,
      createdAt: data.created_at
    };
  }

  async updateIncubationProgram(id: string, programData: Partial<IncubationProgram>): Promise<IncubationProgram> {
    const updateData: any = {};
    
    if (programData.programName !== undefined) updateData.program_name = programData.programName;
    if (programData.programType !== undefined) updateData.program_type = programData.programType;
    if (programData.startDate !== undefined) updateData.start_date = programData.startDate;
    if (programData.endDate !== undefined) updateData.end_date = programData.endDate;
    if (programData.status !== undefined) updateData.status = programData.status;
    if (programData.description !== undefined) updateData.description = programData.description;
    if (programData.mentorName !== undefined) updateData.mentor_name = programData.mentorName;
    if (programData.mentorEmail !== undefined) updateData.mentor_email = programData.mentorEmail;
    if (programData.programUrl !== undefined) updateData.program_url = programData.programUrl;

    const { data, error } = await supabase
      .from('incubation_programs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      programName: data.program_name,
      programType: data.program_type as 'Incubation' | 'Acceleration' | 'Mentorship' | 'Bootcamp' | 'Grant',
      startDate: data.start_date,
      endDate: data.end_date,
      status: data.status as 'Active' | 'Completed' | 'Dropped',
      description: data.description,
      mentorName: data.mentor_name,
      mentorEmail: data.mentor_email,
      programUrl: data.program_url,
      createdAt: data.created_at
    };
  }

  async deleteIncubationProgram(id: string): Promise<void> {
    const { error } = await supabase
      .from('incubation_programs')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  async getProgramTypes(): Promise<string[]> {
    return ['Grant', 'Incubation', 'Acceleration', 'Mentorship', 'Bootcamp'];
  }

  async getProgramStatuses(): Promise<string[]> {
    return ['Active', 'Completed', 'Dropped'];
  }

  async getPopularPrograms(): Promise<string[]> {
    return [
      'Y Combinator',
      'Techstars',
      '500 Global',
      'AngelPad',
      'Plug and Play',
      'MassChallenge',
      'Startupbootcamp',
      'Seedcamp',
      'Entrepreneur First',
      'Antler'
    ];
  }

  // =====================================================
  // REAL-TIME SUBSCRIPTIONS
  // =====================================================

  subscribeToIncubationPrograms(startupId: number, callback: (programs: IncubationProgram[]) => void) {
    const channel = supabase
      .channel('incubation_programs_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'incubation_programs',
        filter: `startup_id=eq.${startupId}`
      }, async () => {
        try {
          const programs = await this.getIncubationPrograms(startupId);
          callback(programs);
        } catch (e) {
          console.warn('Failed to refresh incubation programs after realtime event:', e);
        }
      })
      .subscribe();
    return channel;
  }

  // =====================================================
  // ANALYTICS FUNCTIONS
  // =====================================================

  async getProgramSummary(startupId: number): Promise<{
    totalPrograms: number;
    activePrograms: number;
    completedPrograms: number;
    averageDuration: number;
  }> {
    const programs = await this.getIncubationPrograms(startupId);
    
    const totalPrograms = programs.length;
    const activePrograms = programs.filter(p => p.status === 'Active').length;
    const completedPrograms = programs.filter(p => p.status === 'Completed').length;
    
    const durations = programs.map(p => {
      const start = new Date(p.startDate);
      const end = new Date(p.endDate);
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    });
    
    const averageDuration = durations.length > 0 
      ? durations.reduce((sum, days) => sum + days, 0) / durations.length 
      : 0;

    return {
      totalPrograms,
      activePrograms,
      completedPrograms,
      averageDuration
    };
  }

  async getProgramsByType(startupId: number): Promise<{
    type: string;
    count: number;
  }[]> {
    const programs = await this.getIncubationPrograms(startupId);
    
    const typeCounts = programs.reduce((acc, program) => {
      acc[program.programType] = (acc[program.programType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count
    }));
  }
}

export const incubationProgramsService = new IncubationProgramsService();
