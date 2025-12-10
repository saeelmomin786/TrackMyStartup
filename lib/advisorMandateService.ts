import { supabase } from './supabase';

export interface AdvisorMandate {
  id: number;
  advisor_id: string;
  name: string;
  stage?: string;
  round_type?: string;
  domain?: string;
  amount_min?: number;
  amount_max?: number;
  equity_min?: number;
  equity_max?: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAdvisorMandate {
  advisor_id: string;
  name: string;
  stage?: string;
  round_type?: string;
  domain?: string;
  amount_min?: number;
  amount_max?: number;
  equity_min?: number;
  equity_max?: number;
  is_active?: boolean;
  display_order?: number;
}

export interface UpdateAdvisorMandate {
  name?: string;
  stage?: string;
  round_type?: string;
  domain?: string;
  amount_min?: number;
  amount_max?: number;
  equity_min?: number;
  equity_max?: number;
  is_active?: boolean;
  display_order?: number;
}

class AdvisorMandateService {
  // Get all mandates for an advisor
  async getMandatesByAdvisor(advisorId: string, includeInactive: boolean = false): Promise<AdvisorMandate[]> {
    try {
      let query = supabase
        .from('advisor_mandates')
        .select('*')
        .eq('advisor_id', advisorId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching advisor mandates:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getMandatesByAdvisor:', error);
      return [];
    }
  }

  // Get a single mandate by ID
  async getMandateById(mandateId: number): Promise<AdvisorMandate | null> {
    try {
      const { data, error } = await supabase
        .from('advisor_mandates')
        .select('*')
        .eq('id', mandateId)
        .single();

      if (error) {
        console.error('Error fetching mandate by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getMandateById:', error);
      return null;
    }
  }

  // Create a new mandate
  async createMandate(mandate: CreateAdvisorMandate): Promise<AdvisorMandate | null> {
    try {
      const mandateData: any = {
        ...mandate,
        is_active: mandate.is_active ?? true,
        display_order: mandate.display_order ?? 0
      };

      const { data, error } = await supabase
        .from('advisor_mandates')
        .insert([mandateData])
        .select()
        .single();

      if (error) {
        console.error('Error creating mandate:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createMandate:', error);
      return null;
    }
  }

  // Update an existing mandate
  async updateMandate(mandateId: number, updates: UpdateAdvisorMandate): Promise<AdvisorMandate | null> {
    try {
      const { data, error } = await supabase
        .from('advisor_mandates')
        .update(updates)
        .eq('id', mandateId)
        .select()
        .single();

      if (error) {
        console.error('Error updating mandate:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateMandate:', error);
      return null;
    }
  }

  // Delete a mandate (soft delete by setting is_active = false)
  async deleteMandate(mandateId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('advisor_mandates')
        .update({ is_active: false })
        .eq('id', mandateId);

      if (error) {
        console.error('Error deleting mandate:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteMandate:', error);
      return false;
    }
  }

  // Hard delete a mandate (permanent removal)
  async hardDeleteMandate(mandateId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('advisor_mandates')
        .delete()
        .eq('id', mandateId);

      if (error) {
        console.error('Error hard deleting mandate:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in hardDeleteMandate:', error);
      return false;
    }
  }

  // Reorder mandates
  async reorderMandates(mandates: { id: number; display_order: number }[]): Promise<boolean> {
    try {
      for (const mandate of mandates) {
        const { error } = await supabase
          .from('advisor_mandates')
          .update({ display_order: mandate.display_order })
          .eq('id', mandate.id);

        if (error) {
          console.error(`Error updating display order for mandate ${mandate.id}:`, error);
          throw error;
        }
      }

      return true;
    } catch (error) {
      console.error('Error in reorderMandates:', error);
      return false;
    }
  }
}

export const advisorMandateService = new AdvisorMandateService();



