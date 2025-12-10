import { supabase } from './supabase';

export type GeneralDataCategory = 'country' | 'sector' | 'mentor_type' | 'round_type' | 'stage' | 'domain' | 'currency' | 'firm_type';

export interface GeneralDataItem {
  id: number;
  category: GeneralDataCategory;
  code?: string;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  metadata?: any;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreateGeneralDataItem {
  category: GeneralDataCategory;
  code?: string;
  name: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
  metadata?: any;
}

export interface UpdateGeneralDataItem {
  code?: string;
  name?: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
  metadata?: any;
}

class GeneralDataService {
  // Get all items for a specific category
  async getItemsByCategory(category: GeneralDataCategory, includeInactive: boolean = false): Promise<GeneralDataItem[]> {
    try {
      let query = supabase
        .from('general_data')
        .select('*')
        .eq('category', category)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Error fetching ${category} items:`, error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error(`Error in getItemsByCategory for ${category}:`, error);
      return [];
    }
  }

  // Get all active items (for public use)
  async getAllActiveItems(): Promise<GeneralDataItem[]> {
    try {
      const { data, error } = await supabase
        .from('general_data')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching all active items:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllActiveItems:', error);
      return [];
    }
  }

  // Get all items (admin only - includes inactive)
  async getAllItems(includeInactive: boolean = true): Promise<GeneralDataItem[]> {
    try {
      let query = supabase
        .from('general_data')
        .select('*')
        .order('category', { ascending: true })
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching all items:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllItems:', error);
      return [];
    }
  }

  // Get items grouped by category
  async getItemsGroupedByCategory(includeInactive: boolean = false): Promise<Record<GeneralDataCategory, GeneralDataItem[]>> {
    try {
      const items = await this.getAllItems(includeInactive);
      const grouped: Record<string, GeneralDataItem[]> = {};

      items.forEach(item => {
        if (!grouped[item.category]) {
          grouped[item.category] = [];
        }
        grouped[item.category].push(item);
      });

      return grouped as Record<GeneralDataCategory, GeneralDataItem[]>;
    } catch (error) {
      console.error('Error in getItemsGroupedByCategory:', error);
      return {} as Record<GeneralDataCategory, GeneralDataItem[]>;
    }
  }

  // Get a single item by ID
  async getItemById(id: number): Promise<GeneralDataItem | null> {
    try {
      const { data, error } = await supabase
        .from('general_data')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching item by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getItemById:', error);
      return null;
    }
  }

  // Create a new item
  async createItem(item: CreateGeneralDataItem, userId?: string): Promise<GeneralDataItem | null> {
    try {
      const itemData: any = {
        ...item,
        display_order: item.display_order ?? 0,
        is_active: item.is_active ?? true,
        created_by: userId,
        updated_by: userId
      };

      const { data, error } = await supabase
        .from('general_data')
        .insert([itemData])
        .select()
        .single();

      if (error) {
        console.error('Error creating item:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createItem:', error);
      return null;
    }
  }

  // Update an existing item
  async updateItem(id: number, updates: UpdateGeneralDataItem, userId?: string): Promise<GeneralDataItem | null> {
    try {
      const updateData: any = {
        ...updates,
        updated_by: userId,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('general_data')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating item:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateItem:', error);
      return null;
    }
  }

  // Delete an item (soft delete by setting is_active = false)
  async deleteItem(id: number, userId?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('general_data')
        .update({ 
          is_active: false,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error deleting item:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteItem:', error);
      return false;
    }
  }

  // Hard delete an item (permanent removal)
  async hardDeleteItem(id: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('general_data')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error hard deleting item:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in hardDeleteItem:', error);
      return false;
    }
  }

  // Reorder items (update display_order for multiple items)
  async reorderItems(items: { id: number; display_order: number }[], userId?: string): Promise<boolean> {
    try {
      const updates = items.map(item => ({
        id: item.id,
        display_order: item.display_order,
        updated_by: userId,
        updated_at: new Date().toISOString()
      }));

      // Update each item individually (Supabase doesn't support batch updates easily)
      for (const update of updates) {
        const { error } = await supabase
          .from('general_data')
          .update({
            display_order: update.display_order,
            updated_by: update.updated_by,
            updated_at: update.updated_at
          })
          .eq('id', update.id);

        if (error) {
          console.error(`Error updating display order for item ${update.id}:`, error);
          throw error;
        }
      }

      return true;
    } catch (error) {
      console.error('Error in reorderItems:', error);
      return false;
    }
  }

  // Get unique categories
  async getCategories(): Promise<GeneralDataCategory[]> {
    try {
      const { data, error } = await supabase
        .from('general_data')
        .select('category')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching categories:', error);
        return [];
      }

      const uniqueCategories = Array.from(new Set(data?.map(item => item.category) || []));
      return uniqueCategories as GeneralDataCategory[];
    } catch (error) {
      console.error('Error in getCategories:', error);
      return [];
    }
  }

  // Bulk import items
  async bulkImportItems(items: CreateGeneralDataItem[], userId?: string): Promise<{ success: number; errors: number }> {
    let success = 0;
    let errors = 0;

    for (const item of items) {
      try {
        const result = await this.createItem(item, userId);
        if (result) {
          success++;
        } else {
          errors++;
        }
      } catch (error) {
        console.error('Error importing item:', item, error);
        errors++;
      }
    }

    return { success, errors };
  }
}

export const generalDataService = new GeneralDataService();




