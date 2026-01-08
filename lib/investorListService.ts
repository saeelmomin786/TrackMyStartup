import { supabase } from './supabase';

export interface InvestorListItem {
  id: number;
  name: string;
  fund_type?: string[]; // Array of fund types
  website?: string;
  domain?: string[]; // Array of domains
  round_type?: string[]; // Array of round types (Pre-Seed, Seed, Series A, etc.)
  country?: string[]; // Array of countries
  linkedin?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreateInvestorListItem {
  name: string;
  fund_type?: string[]; // Array of fund types
  website?: string;
  domain?: string[]; // Array of domains
  round_type?: string[]; // Array of round types (Pre-Seed, Seed, Series A, etc.)
  country?: string[]; // Array of countries
  linkedin?: string;
  image_url?: string;
  is_active?: boolean;
}

export interface UpdateInvestorListItem {
  name?: string;
  fund_type?: string[]; // Array of fund types
  website?: string;
  domain?: string[]; // Array of domains
  round_type?: string[]; // Array of round types (Pre-Seed, Seed, Series A, etc.)
  country?: string[]; // Array of countries
  linkedin?: string;
  image_url?: string;
  is_active?: boolean;
}

class InvestorListService {
  // Get all active investors (for startup dashboard)
  async getAllActive(): Promise<InvestorListItem[]> {
    try {
      const { data, error } = await supabase
        .from('investor_list')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching active investors:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllActive:', error);
      return [];
    }
  }

  // Get all investors (admin only - includes inactive)
  async getAll(includeInactive: boolean = true): Promise<InvestorListItem[]> {
    try {
      let query = supabase
        .from('investor_list')
        .select('*')
        .order('created_at', { ascending: false });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching investors:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAll:', error);
      return [];
    }
  }

  // Get a single investor by ID
  async getById(id: number): Promise<InvestorListItem | null> {
    try {
      const { data, error } = await supabase
        .from('investor_list')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching investor by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getById:', error);
      return null;
    }
  }

  // Create a new investor
  async create(investor: CreateInvestorListItem, userId?: string): Promise<InvestorListItem | null> {
    try {
      const investorData: any = {
        ...investor,
        is_active: investor.is_active ?? true,
        created_by: userId,
        updated_by: userId
      };

      const { data, error } = await supabase
        .from('investor_list')
        .insert([investorData])
        .select()
        .single();

      if (error) {
        console.error('Error creating investor:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in create:', error);
      return null;
    }
  }

  // Update an existing investor
  async update(id: number, updates: UpdateInvestorListItem, userId?: string): Promise<InvestorListItem | null> {
    try {
      const updateData: any = {
        ...updates,
        updated_by: userId,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('investor_list')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating investor:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in update:', error);
      return null;
    }
  }

  // Delete an investor (soft delete by setting is_active = false)
  async delete(id: number, userId?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('investor_list')
        .update({ 
          is_active: false,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error deleting investor:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in delete:', error);
      return false;
    }
  }

  // Hard delete an investor (permanent removal)
  async hardDelete(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('investor_list')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error hard deleting investor:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in hardDelete:', error);
      return false;
    }
  }

  // Bulk import investors
  async bulkImport(investors: CreateInvestorListItem[], userId?: string): Promise<{ success: number; errors: Array<{ row: number; error: string; data: any }> }> {
    let success = 0;
    const errors: Array<{ row: number; error: string; data: any }> = [];

    for (let i = 0; i < investors.length; i++) {
      const investor = investors[i];
      try {
        if (!investor.name || !investor.name.trim()) {
          errors.push({ row: i + 1, error: 'Name is required', data: investor });
          continue;
        }

        const result = await this.create(investor, userId);
        if (result) {
          success++;
        } else {
          errors.push({ row: i + 1, error: 'Failed to create investor', data: investor });
        }
      } catch (error: any) {
        console.error('Error importing investor:', investor, error);
        errors.push({ row: i + 1, error: error.message || 'Unknown error', data: investor });
      }
    }

    return { success, errors };
  }

  // Search investors
  async search(query: string, includeInactive: boolean = false): Promise<InvestorListItem[]> {
    try {
      let supabaseQuery = supabase
        .from('investor_list')
        .select('*')
        .ilike('name', `%${query}%`)
        .order('name', { ascending: true });

      if (!includeInactive) {
        supabaseQuery = supabaseQuery.eq('is_active', true);
      }

      const { data, error } = await supabaseQuery;

      if (error) {
        console.error('Error searching investors:', error);
        throw error;
      }

      // Filter results in memory for array fields
      const filtered = (data || []).filter((investor) => {
        const searchLower = query.toLowerCase();
        return (
          investor.name?.toLowerCase().includes(searchLower) ||
          investor.fund_type?.some(ft => ft.toLowerCase().includes(searchLower)) ||
          investor.domain?.some(d => d.toLowerCase().includes(searchLower)) ||
          investor.country?.some(c => c.toLowerCase().includes(searchLower))
        );
      });

      return filtered;
    } catch (error) {
      console.error('Error in search:', error);
      return [];
    }
  }
}

export const investorListService = new InvestorListService();

