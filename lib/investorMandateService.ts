import { supabase } from './supabase';

export interface InvestorMandate {
  id: number;
  investor_id: string;
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

export interface CreateInvestorMandate {
  investor_id: string;
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

export interface UpdateInvestorMandate {
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

class InvestorMandateService {
  // Get all mandates for an investor
  async getMandatesByInvestor(investorId: string, includeInactive: boolean = false): Promise<InvestorMandate[]> {
    try {
      let query = supabase
        .from('investor_mandates')
        .select('*')
        .eq('investor_id', investorId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching investor mandates:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getMandatesByInvestor:', error);
      return [];
    }
  }

  // Get a single mandate by ID
  async getMandateById(mandateId: number): Promise<InvestorMandate | null> {
    try {
      const { data, error } = await supabase
        .from('investor_mandates')
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
  async createMandate(mandate: CreateInvestorMandate): Promise<InvestorMandate | null> {
    try {
      const mandateData: any = {
        ...mandate,
        is_active: mandate.is_active ?? true,
        display_order: mandate.display_order ?? 0
      };

      const { data, error } = await supabase
        .from('investor_mandates')
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
  async updateMandate(mandateId: number, updates: UpdateInvestorMandate): Promise<InvestorMandate | null> {
    try {
      const { data, error } = await supabase
        .from('investor_mandates')
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
        .from('investor_mandates')
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
        .from('investor_mandates')
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
          .from('investor_mandates')
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

export const investorMandateService = new InvestorMandateService();


