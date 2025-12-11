import { supabase } from './supabase';

export interface AdvisorAddedInvestor {
  id: number;
  advisor_id: string;
  investor_name: string;
  email: string;
  contact_number?: string;
  website?: string;
  linkedin_url?: string;
  firm_type?: string;
  location?: string;
  investment_focus?: string;
  domain?: string;
  stage?: string;
  notes?: string;
  is_on_tms: boolean;
  tms_investor_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAdvisorAddedInvestor {
  advisor_id: string;
  investor_name: string;
  email: string;
  contact_number?: string;
  website?: string;
  linkedin_url?: string;
  firm_type?: string;
  location?: string;
  investment_focus?: string;
  domain?: string;
  stage?: string;
  notes?: string;
}

export interface UpdateAdvisorAddedInvestor {
  investor_name?: string;
  email?: string;
  contact_number?: string;
  website?: string;
  linkedin_url?: string;
  firm_type?: string;
  location?: string;
  investment_focus?: string;
  domain?: string;
  stage?: string;
  notes?: string;
  is_on_tms?: boolean;
  tms_investor_id?: string;
}

class AdvisorAddedInvestorService {
  // Get all investors added by an advisor
  async getInvestorsByAdvisor(advisorId: string): Promise<AdvisorAddedInvestor[]> {
    try {
      const { data, error } = await supabase
        .from('advisor_added_investors')
        .select('*')
        .eq('advisor_id', advisorId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching advisor added investors:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getInvestorsByAdvisor:', error);
      return [];
    }
  }

  // Get a single investor by ID
  async getInvestorById(investorId: number): Promise<AdvisorAddedInvestor | null> {
    try {
      const { data, error } = await supabase
        .from('advisor_added_investors')
        .select('*')
        .eq('id', investorId)
        .single();

      if (error) {
        console.error('Error fetching investor by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getInvestorById:', error);
      return null;
    }
  }

  // Create a new added investor
  async createInvestor(investor: CreateAdvisorAddedInvestor): Promise<AdvisorAddedInvestor | null> {
    try {
      const investorData: any = {
        ...investor,
        is_on_tms: false
      };

      const { data, error } = await supabase
        .from('advisor_added_investors')
        .insert([investorData])
        .select()
        .single();

      if (error) {
        console.error('Error creating added investor:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createInvestor:', error);
      return null;
    }
  }

  // Update an existing investor
  async updateInvestor(investorId: number, updates: UpdateAdvisorAddedInvestor): Promise<AdvisorAddedInvestor | null> {
    try {
      const { data, error } = await supabase
        .from('advisor_added_investors')
        .update(updates)
        .eq('id', investorId)
        .select()
        .single();

      if (error) {
        console.error('Error updating investor:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateInvestor:', error);
      return null;
    }
  }

  // Delete an investor
  async deleteInvestor(investorId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('advisor_added_investors')
        .delete()
        .eq('id', investorId);

      if (error) {
        console.error('Error deleting investor:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteInvestor:', error);
      return false;
    }
  }

  // Link to TMS investor (when investor joins TMS)
  async linkToTMSInvestor(investorId: number, tmsInvestorId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('advisor_added_investors')
        .update({
          is_on_tms: true,
          tms_investor_id: tmsInvestorId
        })
        .eq('id', investorId);

      if (error) {
        console.error('Error linking to TMS investor:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in linkToTMSInvestor:', error);
      return false;
    }
  }

  // Send invite to TMS for advisor-added investors
  async sendInviteToTMS(
    investorId: number,
    advisorId: string,
    advisorCode: string
  ): Promise<{ success: boolean; userId?: string; error?: string; isExistingTMSInvestor?: boolean; tmsInvestorId?: number; alreadyHasAdvisor?: boolean; existingAdvisorName?: string }> {
    try {
      // Get investor details first
      const investor = await this.getInvestorById(investorId);
      if (!investor) {
        return { success: false, error: 'Investor not found' };
      }

      // Call API endpoint to handle invite
      const apiUrl = '/api/invite-investor-advisor';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          investorId,
          advisorId,
          advisorCode,
          investorName: investor.investor_name,
          contactEmail: investor.email,
          contactName: investor.investor_name, // Using investor_name as contact name
          redirectUrl: typeof window !== 'undefined' ? window.location.origin : undefined
        }),
      });

      if (!response.ok) {
        let errorData;
        const responseText = await response.text();
        try {
          errorData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('API error - could not parse JSON:', responseText);
          errorData = { error: `Server error (${response.status}): ${responseText || 'Unknown error'}` };
        }
        return { 
          success: false, 
          error: errorData.error || errorData.message || `Failed to send invite (${response.status})`
        };
      }

      const result = await response.json();
      
      // Handle case where investor already has a different advisor
      if (result.alreadyHasAdvisor) {
        return {
          success: false,
          error: `This investor is already linked with another Investment Advisor (${result.existingAdvisorName || 'Unknown'}). Please contact the investor directly to change their Investment Advisor code.`,
          alreadyHasAdvisor: true,
          existingAdvisorName: result.existingAdvisorName
        };
      }

      return { 
        success: result.success, 
        userId: result.userId,
        isExistingTMSInvestor: result.isExistingTMSInvestor,
        tmsInvestorId: result.tmsInvestorId
      };
    } catch (error: any) {
      console.error('Error in sendInviteToTMS:', error);
      return { success: false, error: error.message || 'Failed to send invite' };
    }
  }
}

export const advisorAddedInvestorService = new AdvisorAddedInvestorService();

