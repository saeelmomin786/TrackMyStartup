import { supabase } from './supabase';
import { FinancialRecord, Expense, Revenue } from '../types';
import { validateFinancialRecordDate } from './dateValidation';

// =====================================================
// FINANCIALS SERVICE
// =====================================================

export interface MonthlyFinancialData {
  month_name: string;
  revenue: number;
  expenses: number;
}

export interface VerticalData {
  name: string;
  value: number;
}

export interface FinancialSummary {
  total_funding: number;
  total_revenue: number;
  total_expenses: number;
  available_funds: number;
}

export interface FinancialFilters {
  entity?: string;
  year?: number | 'all';
  record_type?: 'expense' | 'revenue';
}

class FinancialsService {
  // =====================================================
  // CORE CRUD OPERATIONS
  // =====================================================

  async addFinancialRecord(record: Omit<FinancialRecord, 'id'>): Promise<FinancialRecord> {
    // Validate financial record date (no future dates allowed)
    const dateValidation = validateFinancialRecordDate(record.date);
    if (!dateValidation.isValid) {
      throw new Error(dateValidation.error);
    }

    const { data, error } = await supabase
      .from('financial_records')
      .insert({
        startup_id: record.startup_id,
        record_type: record.record_type,
        date: record.date,
        entity: record.entity,
        description: record.description,
        vertical: record.vertical,
        amount: record.amount,
        funding_source: record.funding_source,
        cogs: record.cogs,
        attachment_url: record.attachment_url
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateFinancialRecord(id: string, updates: Partial<FinancialRecord>): Promise<FinancialRecord> {
    // Validate financial record date if being updated (no future dates allowed)
    if (updates.date !== undefined) {
      const dateValidation = validateFinancialRecordDate(updates.date);
      if (!dateValidation.isValid) {
        throw new Error(dateValidation.error);
      }
    }

    const { data, error } = await supabase
      .from('financial_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteFinancialRecord(id: string): Promise<void> {
    try {
      // First, get the record to check if it has an attachment
      const record = await this.getFinancialRecord(id);
      
      if (record && record.attachment_url) {
        // Extract the file path from the URL
        const urlParts = record.attachment_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const startupId = record.startup_id.toString();
        const filePath = `${startupId}/${fileName}`;
        
        // Delete the file from storage
        const { storageService } = await import('./storage');
        await storageService.deleteFile('financial-documents', filePath);
        console.log('🗑️ Deleted attachment file:', filePath);
      }
      
      // Delete the database record
      const { error } = await supabase
        .from('financial_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
      console.log('🗑️ Deleted financial record:', id);
    } catch (error) {
      console.error('Error deleting financial record:', error);
      throw error;
    }
  }

  async getFinancialRecord(id: string): Promise<FinancialRecord | null> {
    const { data, error } = await supabase
      .from('financial_records')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // =====================================================
  // QUERY OPERATIONS
  // =====================================================

  async getFinancialRecords(startupId: number, filters?: FinancialFilters): Promise<FinancialRecord[]> {
    let query = supabase
      .from('financial_records')
      .select('*')
      .eq('startup_id', startupId)
      .order('date', { ascending: false });

    if (filters?.entity && filters.entity !== 'all') {
      query = query.eq('entity', filters.entity);
    }

    if (filters?.year && filters.year !== 'all') {
      query = query.gte('date', `${filters.year}-01-01`)
                   .lt('date', `${filters.year + 1}-01-01`);
    }

    if (filters?.record_type) {
      query = query.eq('record_type', filters.record_type);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getExpenses(startupId: number, filters?: FinancialFilters): Promise<Expense[]> {
    const records = await this.getFinancialRecords(startupId, { ...filters, record_type: 'expense' });
    return records.map(record => ({
      id: record.id,
      date: record.date,
      entity: record.entity,
      description: record.description || '',
      vertical: record.vertical,
      amount: record.amount,
      fundingSource: record.funding_source || '',
      attachmentUrl: record.attachment_url
    }));
  }

  async getRevenues(startupId: number, filters?: FinancialFilters): Promise<Revenue[]> {
    const records = await this.getFinancialRecords(startupId, { ...filters, record_type: 'revenue' });
    return records.map(record => ({
      id: record.id,
      date: record.date,
      entity: record.entity,
      vertical: record.vertical,
      earnings: record.amount,
      cogs: record.cogs || 0,
      attachmentUrl: record.attachment_url
    }));
  }

  // =====================================================
  // ANALYTICS AND CHARTS DATA
  // =====================================================

  async getMonthlyFinancialData(startupId: number, year: number): Promise<MonthlyFinancialData[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_monthly_financial_data', {
          p_startup_id: startupId,
          p_year: year
        });

      if (error) {
        console.error('Error calling get_monthly_financial_data:', error);
        // Fallback to manual calculation if RPC fails
        return this.calculateMonthlyDataManually(startupId, year);
      }
      
      return (data || []).map(item => ({
        month_name: item.month_name,
        revenue: parseFloat(item.revenue || '0'),
        expenses: parseFloat(item.expenses || '0')
      }));
    } catch (error) {
      console.error('Error in getMonthlyFinancialData:', error);
      return this.calculateMonthlyDataManually(startupId, year);
    }
  }

  async getRevenueByVertical(startupId: number, year: number): Promise<VerticalData[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_revenue_by_vertical', {
          p_startup_id: startupId,
          p_year: year
        });

      if (error) {
        console.error('Error calling get_revenue_by_vertical:', error);
        return this.calculateRevenueByVerticalManually(startupId, year);
      }

      return (data || []).map(item => ({
        name: item.vertical_name,
        value: parseFloat(item.total_revenue || '0')
      }));
    } catch (error) {
      console.error('Error in getRevenueByVertical:', error);
      return this.calculateRevenueByVerticalManually(startupId, year);
    }
  }

  async getExpensesByVertical(startupId: number, year: number): Promise<VerticalData[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_expenses_by_vertical', {
          p_startup_id: startupId,
          p_year: year
        });

      if (error) {
        console.error('Error calling get_expenses_by_vertical:', error);
        return this.calculateExpensesByVerticalManually(startupId, year);
      }

      return (data || []).map(item => ({
        name: item.vertical_name,
        value: parseFloat(item.total_expenses || '0')
      }));
    } catch (error) {
      console.error('Error in getExpensesByVertical:', error);
      return this.calculateExpensesByVerticalManually(startupId, year);
    }
  }

  async getFinancialSummary(startupId: number): Promise<FinancialSummary> {
    try {
      const { data, error } = await supabase
        .rpc('get_startup_financial_summary', {
          p_startup_id: startupId
        });

      if (error) {
        console.error('Error calling get_startup_financial_summary:', error);
        return this.calculateFinancialSummaryManually(startupId);
      }

      const summary = data?.[0];
      
      return {
        total_funding: parseFloat(summary?.total_funding || '0'),
        total_revenue: parseFloat(summary?.total_revenue || '0'),
        total_expenses: parseFloat(summary?.total_expenses || '0'),
        available_funds: parseFloat(summary?.available_funds || '0')
      };
    } catch (error) {
      console.error('Error in getFinancialSummary:', error);
      return this.calculateFinancialSummaryManually(startupId);
    }
  }

  // =====================================================
  // MANUAL CALCULATION FALLBACKS
  // =====================================================

  private async calculateMonthlyDataManually(startupId: number, year: number): Promise<MonthlyFinancialData[]> {
    const records = await this.getFinancialRecords(startupId, { year });
    
    const monthlyData: { [key: string]: { revenue: number; expenses: number } } = {};
    
    // Initialize all months
    for (let month = 1; month <= 12; month++) {
      const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short' });
      monthlyData[monthName] = { revenue: 0, expenses: 0 };
    }
    
    // Aggregate data
    records.forEach(record => {
      const monthName = new Date(record.date).toLocaleDateString('en-US', { month: 'short' });
      if (record.record_type === 'revenue') {
        monthlyData[monthName].revenue += record.amount;
      } else {
        monthlyData[monthName].expenses += record.amount;
      }
    });
    
    return Object.entries(monthlyData).map(([month_name, data]) => ({
      month_name,
      revenue: data.revenue,
      expenses: data.expenses
    }));
  }

  private async calculateRevenueByVerticalManually(startupId: number, year: number): Promise<VerticalData[]> {
    const records = await this.getFinancialRecords(startupId, { year, record_type: 'revenue' });
    
    const verticalTotals: { [key: string]: number } = {};
    
    records.forEach(record => {
      verticalTotals[record.vertical] = (verticalTotals[record.vertical] || 0) + record.amount;
    });
    
    return Object.entries(verticalTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }

  private async calculateExpensesByVerticalManually(startupId: number, year: number): Promise<VerticalData[]> {
    const records = await this.getFinancialRecords(startupId, { year, record_type: 'expense' });
    
    const verticalTotals: { [key: string]: number } = {};
    
    records.forEach(record => {
      verticalTotals[record.vertical] = (verticalTotals[record.vertical] || 0) + record.amount;
    });
    
    return Object.entries(verticalTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }

  private async calculateFinancialSummaryManually(startupId: number): Promise<FinancialSummary> {
    // Use the database function for accurate calculations
    try {
      const { data, error } = await supabase.rpc('get_financial_data', {
        startup_id_param: startupId
      });
      
      if (error) {
        console.error('Error getting financial data from database function:', error);
        // Fallback to manual calculation
        return await this.calculateFinancialSummaryFallback(startupId);
      }
      
      const result = data?.[0];
      if (result) {
        return {
          total_funding: result.total_funding || 0,
          total_revenue: result.total_revenue || 0,
          total_expenses: result.total_expenses || 0,
          available_funds: result.available_funds || 0
        };
      }
    } catch (error) {
      console.error('Error calling get_financial_data:', error);
    }
    
    // Fallback to manual calculation
    return await this.calculateFinancialSummaryFallback(startupId);
  }

  private async calculateFinancialSummaryFallback(startupId: number): Promise<FinancialSummary> {
    const records = await this.getFinancialRecords(startupId);
    
    let total_revenue = 0;
    let total_expenses = 0;
    
    records.forEach(record => {
      if (record.record_type === 'revenue') {
        total_revenue += record.amount;
      } else {
        total_expenses += record.amount;
      }
    });
    
    // Get startup funding from startups table
    const { data: startupData } = await supabase
      .from('startups')
      .select('total_funding')
      .eq('id', startupId)
      .single();
    
    const total_funding = startupData?.total_funding || 0;
    const available_funds = total_revenue - total_expenses; // Changed: available funds = revenue - expenses, not funding - expenses
    
    return {
      total_funding,
      total_revenue,
      total_expenses,
      available_funds
    };
  }

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  async getEntities(startupId: number): Promise<string[]> {
    const { data, error } = await supabase
      .from('financial_records')
      .select('entity')
      .eq('startup_id', startupId)
      .order('entity');

    if (error) throw error;
    return [...new Set(data?.map(item => item.entity) || [])];
  }

  async getVerticals(startupId: number): Promise<string[]> {
    const { data, error } = await supabase
      .from('financial_records')
      .select('vertical')
      .eq('startup_id', startupId)
      .order('vertical');

    if (error) throw error;
    return [...new Set(data?.map(item => item.vertical) || [])];
  }

  async getAvailableYears(startupId: number): Promise<(number | 'all')[]> {
    const { data, error } = await supabase
      .from('financial_records')
      .select('date')
      .eq('startup_id', startupId);

    if (error) throw error;
    
    const years = data?.map(item => new Date(item.date).getFullYear()) || [];
    const uniqueYears = [...new Set(years)].sort((a, b) => b - a); // Descending order
    
    // If no years found, return current year
    if (uniqueYears.length === 0) {
      return ['all', new Date().getFullYear()];
    }
    
    // Return 'all' as first option, followed by actual years
    return ['all', ...uniqueYears];
  }

  // =====================================================
  // FILE UPLOAD HELPERS
  // =====================================================

  async uploadAttachment(file: File, startupId: number): Promise<string> {
    const fileName = `${startupId}/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('financial-attachments')
      .upload(fileName, file);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('financial-attachments')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }

  async deleteAttachment(url: string): Promise<void> {
    const path = url.split('/').slice(-2).join('/'); // Extract path from URL
    const { error } = await supabase.storage
      .from('financial-attachments')
      .remove([path]);

    if (error) throw error;
  }

  // =====================================================
  // DOWNLOAD HELPERS
  // =====================================================

  async getAttachmentDownloadUrl(attachmentUrl: string): Promise<string> {
    try {
      // If the URL is already a valid public URL, return it
      if (attachmentUrl && attachmentUrl.startsWith('http')) {
        return attachmentUrl;
      }

      // If it's a file path, generate the public URL
      if (attachmentUrl && !attachmentUrl.startsWith('http')) {
        const { data } = supabase.storage
          .from('financial-attachments')
          .getPublicUrl(attachmentUrl);
        
        return data.publicUrl;
      }

      throw new Error('Invalid attachment URL');
    } catch (error) {
      console.error('Error generating download URL:', error);
      throw error;
    }
  }

  // Extract file path from a full URL
  extractFilePathFromUrl(url: string): string | null {
    try {
      // If it's a Supabase URL, extract the path
      if (url.includes('supabase.co/storage/v1/object/public/')) {
        const parts = url.split('/');
        const bucketIndex = parts.findIndex(part => part === 'financial-attachments');
        if (bucketIndex !== -1 && bucketIndex + 1 < parts.length) {
          return parts.slice(bucketIndex + 1).join('/');
        }
      }
      
      // If it's already a file path, return as is
      if (!url.startsWith('http')) {
        return url;
      }

      return null;
    } catch (error) {
      console.error('Error extracting file path:', error);
      return null;
    }
  }
}

export const financialsService = new FinancialsService();
