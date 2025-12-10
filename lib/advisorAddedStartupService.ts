import { supabase } from './supabase';

export interface AdvisorAddedStartup {
  id: number;
  advisor_id: string;
  startup_name: string;
  sector?: string;
  website_url?: string;
  linkedin_url?: string;
  contact_email: string;
  contact_name: string;
  contact_number?: string;
  description?: string;
  current_valuation?: number;
  investment_amount?: number;
  equity_percentage?: number;
  investment_date?: string;
  currency: string;
  domain?: string;
  stage?: string;
  round_type?: string;
  country?: string;
  is_on_tms: boolean;
  tms_startup_id?: number;
  invite_sent_at?: string;
  invite_status: 'not_sent' | 'sent' | 'accepted' | 'declined';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAdvisorAddedStartup {
  advisor_id: string;
  startup_name: string;
  sector?: string;
  website_url?: string;
  linkedin_url?: string;
  contact_email: string;
  contact_name: string;
  contact_number?: string;
  description?: string;
  current_valuation?: number;
  investment_amount?: number;
  equity_percentage?: number;
  investment_date?: string;
  currency?: string;
  domain?: string;
  stage?: string;
  round_type?: string;
  country?: string;
  notes?: string;
}

export interface UpdateAdvisorAddedStartup {
  startup_name?: string;
  sector?: string;
  website_url?: string;
  linkedin_url?: string;
  contact_email?: string;
  contact_name?: string;
  contact_number?: string;
  description?: string;
  current_valuation?: number;
  investment_amount?: number;
  equity_percentage?: number;
  investment_date?: string;
  currency?: string;
  domain?: string;
  stage?: string;
  round_type?: string;
  country?: string;
  notes?: string;
  is_on_tms?: boolean;
  tms_startup_id?: number;
  invite_status?: 'not_sent' | 'sent' | 'accepted' | 'declined';
}

class AdvisorAddedStartupService {
  // Get all startups added by an advisor
  async getStartupsByAdvisor(advisorId: string): Promise<AdvisorAddedStartup[]> {
    try {
      const { data, error } = await supabase
        .from('advisor_added_startups')
        .select('*')
        .eq('advisor_id', advisorId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching advisor added startups:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getStartupsByAdvisor:', error);
      return [];
    }
  }

  // Get a single startup by ID
  async getStartupById(startupId: number): Promise<AdvisorAddedStartup | null> {
    try {
      const { data, error } = await supabase
        .from('advisor_added_startups')
        .select('*')
        .eq('id', startupId)
        .single();

      if (error) {
        console.error('Error fetching startup by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getStartupById:', error);
      return null;
    }
  }

  // Create a new added startup
  async createStartup(startup: CreateAdvisorAddedStartup): Promise<AdvisorAddedStartup | null> {
    try {
      const startupData: any = {
        ...startup,
        currency: startup.currency || 'USD',
        is_on_tms: false,
        invite_status: 'not_sent'
      };

      const { data, error } = await supabase
        .from('advisor_added_startups')
        .insert([startupData])
        .select()
        .single();

      if (error) {
        console.error('Error creating added startup:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createStartup:', error);
      return null;
    }
  }

  // Update an existing startup
  async updateStartup(startupId: number, updates: UpdateAdvisorAddedStartup): Promise<AdvisorAddedStartup | null> {
    try {
      const { data, error } = await supabase
        .from('advisor_added_startups')
        .update(updates)
        .eq('id', startupId)
        .select()
        .single();

      if (error) {
        console.error('Error updating startup:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateStartup:', error);
      return null;
    }
  }

  // Delete a startup
  async deleteStartup(startupId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('advisor_added_startups')
        .delete()
        .eq('id', startupId);

      if (error) {
        console.error('Error deleting startup:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteStartup:', error);
      return false;
    }
  }

  // Send invite to TMS (update invite status)
  async sendInviteToTMS(startupId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('advisor_added_startups')
        .update({
          invite_status: 'sent',
          invite_sent_at: new Date().toISOString()
        })
        .eq('id', startupId);

      if (error) {
        console.error('Error sending invite:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in sendInviteToTMS:', error);
      return false;
    }
  }

  // Link to TMS startup (when startup joins TMS)
  async linkToTMSStartup(startupId: number, tmsStartupId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('advisor_added_startups')
        .update({
          is_on_tms: true,
          tms_startup_id: tmsStartupId,
          invite_status: 'accepted'
        })
        .eq('id', startupId);

      if (error) {
        console.error('Error linking to TMS startup:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in linkToTMSStartup:', error);
      return false;
    }
  }
}

export const advisorAddedStartupService = new AdvisorAddedStartupService();




