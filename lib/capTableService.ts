import { supabase } from './supabase';
import { InvestmentRecord, InvestorType, InvestmentRoundType, Founder, FundraisingDetails, InvestmentType, StartupDomain, StartupStage } from '../types';
import { validateInvestmentDate, validateValuationDate } from './dateValidation';

export interface InvestmentSummary {
  total_equity_funding: number;
  total_debt_funding: number;
  total_grant_funding: number;
  total_investments: number;
  avg_equity_allocated: number;
}

export interface ValuationHistoryData {
  round_name: string;
  valuation: number;
  investment_amount: number;
  date: string;
}

export interface EquityDistributionData {
  holder_type: string;
  equity_percentage: number;
  total_amount: number;
}

export interface FundraisingStatus {
  active: boolean;
  type: string;
  value: number;
  equity: number;
  validation_requested: boolean;
  pitch_deck_url?: string;
  pitch_video_url?: string;
}

export interface InvestmentFilters {
  investorType?: InvestorType;
  investmentType?: InvestmentRoundType;
  dateFrom?: string;
  dateTo?: string;
}

class CapTableService {
  // =====================================================
  // INVESTMENT RECORDS CRUD
  // =====================================================

  async getInvestmentRecords(startupId: number, filters?: InvestmentFilters): Promise<InvestmentRecord[]> {
    let query = supabase
      .from('investment_records')
      .select('*')
      .eq('startup_id', startupId)
      .order('date', { ascending: false });

    if (filters?.investorType) {
      query = query.eq('investor_type', filters.investorType);
    }

    if (filters?.investmentType) {
      query = query.eq('investment_type', filters.investmentType);
    }

    if (filters?.dateFrom) {
      query = query.gte('date', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('date', filters.dateTo);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(record => ({
      id: record.id,
      date: record.date,
      investorType: record.investor_type as InvestorType,
      investmentType: record.investment_type as InvestmentRoundType,
      investorName: record.investor_name,
      investorCode: record.investor_code,
      amount: record.amount,
      equityAllocated: record.equity_allocated,
      shares: record.shares,
      pricePerShare: record.price_per_share,
      preMoneyValuation: record.pre_money_valuation,
      postMoneyValuation: record.post_money_valuation,
      proofUrl: record.proof_url
    }));
  }

  // =====================================================
  // TOTAL SHARES CRUD
  // =====================================================

  async getTotalShares(startupId: number): Promise<number> {
    const { data, error } = await supabase
      .from('startup_shares')
      .select('total_shares')
      .eq('startup_id', startupId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: row not found
      throw error;
    }
    return data?.total_shares ?? 0;
  }

  async getStartupSharesData(startupId: number): Promise<{totalShares: number, esopReservedShares: number, pricePerShare: number}> {
    console.log('🚨 CRITICAL - getStartupSharesData called for startupId:', startupId);
    
    // Load shares data directly from startup_shares table
    const { data, error } = await supabase
      .from('startup_shares')
      .select('total_shares, esop_reserved_shares, price_per_share')
      .eq('startup_id', startupId)
      .single();

    console.log('🚨 CRITICAL - getStartupSharesData database query result:', { data, error });

    if (error && error.code !== 'PGRST116') { // PGRST116: row not found
      console.error('❌ Error loading startup shares data:', error);
      throw error;
    }
    
    const result = {
      totalShares: data?.total_shares ?? 0,
      esopReservedShares: data?.esop_reserved_shares ?? 0,
      pricePerShare: data?.price_per_share ?? 0
    };
    
    console.log('🚨 CRITICAL - getStartupSharesData returning:', result);
    
    // DETAILED DEBUG: Track what data is being returned
    console.log('🔍 DETAILED DEBUG - getStartupSharesData Data Analysis:', {
      'rawData': data,
      'totalShares': result.totalShares,
      'esopReservedShares': result.esopReservedShares,
      'pricePerShare': result.pricePerShare,
      'hasPricePerShare': result.pricePerShare > 0,
      'dataSource': 'startup_shares table'
    });
    
    return result;
  }


  // New method to get accurate cap table data
  async getCapTableData(startupId: number): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('get_cap_table_data', {
        startup_id_param: startupId
      });
      
      if (error) {
        console.error('Error getting cap table data:', error);
        return null;
      }
      
      return data?.[0] || null;
    } catch (error) {
      console.error('Error calling get_cap_table_data:', error);
      return null;
    }
  }

  async upsertTotalShares(startupId: number, totalShares: number, pricePerShare?: number): Promise<number> {
    if (totalShares < 0 || !Number.isFinite(totalShares)) {
      throw new Error('Total shares must be a non-negative number');
    }

    const { data, error } = await supabase
      .from('startup_shares')
      .upsert({
        startup_id: startupId,
        total_shares: totalShares,
        price_per_share: pricePerShare ?? null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'startup_id' })
      .select('total_shares')
      .single();

    if (error) throw error;
    return data.total_shares ?? totalShares;
  }

  async getPricePerShare(startupId: number): Promise<number> {
    const { data, error } = await supabase
      .from('startup_shares')
      .select('price_per_share')
      .eq('startup_id', startupId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return data?.price_per_share ?? 0;
  }

  async upsertPricePerShare(startupId: number, pricePerShare: number): Promise<number> {
    if (pricePerShare < 0 || !Number.isFinite(pricePerShare)) {
      throw new Error('Price per share must be a non-negative number');
    }

    // First, check if a record exists
    const { data: existingData } = await supabase
      .from('startup_shares')
      .select('total_shares, esop_reserved_shares')
      .eq('startup_id', startupId)
      .single();

    const upsertData = {
      startup_id: startupId,
      price_per_share: pricePerShare,
      total_shares: existingData?.total_shares ?? 1000000, // Default to 1M shares if not set
      esop_reserved_shares: existingData?.esop_reserved_shares ?? 0, // Default to 0 if not set
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('startup_shares')
      .upsert(upsertData, { onConflict: 'startup_id' })
      .select('price_per_share, total_shares, esop_reserved_shares')
      .single();

    if (error) {
      console.error('❌ Upsert error:', error);
      throw error;
    }

    return data.price_per_share ?? pricePerShare;
  }

  async initializeStartupShares(startupId: number, totalShares: number = 1000000, pricePerShare: number = 1.0): Promise<void> {
    const initData = {
      startup_id: startupId,
      total_shares: totalShares,
      price_per_share: pricePerShare,
      esop_reserved_shares: 0,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('startup_shares')
      .upsert(initData, { onConflict: 'startup_id' });

    if (error) {
      console.error('❌ Initialize error:', error);
      throw error;
    }
  }

  async getEsopReservedShares(startupId: number): Promise<number> {
    const { data, error } = await supabase
      .from('startup_shares')
      .select('esop_reserved_shares')
      .eq('startup_id', startupId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return data?.esop_reserved_shares ?? 0;
  }

  // Get total ESOP equity allocated to employees
  async getTotalEsopEquity(startupId: number): Promise<number> {
    const { data, error } = await supabase
      .from('employees')
      .select('esop_allocation')
      .eq('startup_id', startupId);

    if (error) throw error;

    const totalEsopValue = (data || []).reduce((sum, emp) => sum + (emp.esop_allocation || 0), 0);
    
    // Get startup valuation to calculate percentage
    const { data: startupData, error: startupError } = await supabase
      .from('startups')
      .select('current_valuation')
      .eq('id', startupId)
      .single();

    if (startupError) throw startupError;

    const valuation = startupData?.current_valuation || 0;
    if (valuation === 0) return 0;

    // Calculate ESOP equity percentage based on valuation
    return (totalEsopValue / valuation) * 100;
  }

  async upsertEsopReservedShares(startupId: number, shares: number): Promise<number> {
    if (shares < 0 || !Number.isFinite(shares)) {
      throw new Error('ESOP reserved shares must be a non-negative number');
    }

    const { data, error } = await supabase
      .from('startup_shares')
      .upsert({
        startup_id: startupId,
        esop_reserved_shares: shares,
        updated_at: new Date().toISOString()
      }, { onConflict: 'startup_id' })
      .select('esop_reserved_shares')
      .single();

    if (error) throw error;
    return data.esop_reserved_shares ?? shares;
  }

  async addInvestmentRecord(startupId: number, investmentData: Omit<InvestmentRecord, 'id'>): Promise<InvestmentRecord> {
    console.log('Service: Adding investment record with data:', { startupId, investmentData });
    
    // Validate required fields
    if (!investmentData.date) {
      throw new Error('Date is required');
    }
    
    // Validate investment date (no future dates allowed)
    const dateValidation = validateInvestmentDate(investmentData.date);
    if (!dateValidation.isValid) {
      throw new Error(dateValidation.error);
    }
    
    if (!investmentData.investorType) {
      throw new Error('Investor type is required');
    }
    if (!investmentData.investmentType) {
      throw new Error('Investment type is required');
    }
    if (!investmentData.investorName) {
      throw new Error('Investor name is required');
    }
    if (!investmentData.amount || investmentData.amount <= 0) {
      throw new Error('Valid investment amount is required');
    }
    if (!investmentData.equityAllocated || investmentData.equityAllocated < 0) {
      throw new Error('Valid equity allocation is required');
    }
    // Validate shares data if provided
    if (investmentData.shares !== undefined && (!investmentData.shares || investmentData.shares <= 0)) {
      throw new Error('Valid number of shares is required');
    }
    if (investmentData.pricePerShare !== undefined && (!investmentData.pricePerShare || investmentData.pricePerShare <= 0)) {
      throw new Error('Valid price per share is required');
    }
    // Post-money will be computed from amount & equity in UI; backend allows null and stores provided value

    const { data, error } = await supabase
      .from('investment_records')
      .insert({
        startup_id: startupId,
        date: investmentData.date,
        investor_type: investmentData.investorType,
        investment_type: investmentData.investmentType,
        investor_name: investmentData.investorName,
        investor_code: investmentData.investorCode,
        amount: investmentData.amount,
        equity_allocated: investmentData.equityAllocated,
        shares: investmentData.shares || null,
        price_per_share: investmentData.pricePerShare || null,
        pre_money_valuation: investmentData.preMoneyValuation,
        post_money_valuation: (investmentData as any).postMoneyValuation ?? null,
        proof_url: investmentData.proofUrl
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error adding investment record:', error);
      throw error;
    }

    // Update startup's total funding
    // First get current total funding
    const { data: currentStartup, error: fetchError } = await supabase
      .from('startups')
      .select('total_funding')
      .eq('id', startupId)
      .single();

    if (fetchError) {
      console.error('Error fetching current startup funding:', fetchError);
    } else {
      // Update with new total
      const newTotalFunding = (currentStartup?.total_funding || 0) + investmentData.amount;
      const { error: updateError } = await supabase
        .from('startups')
        .update({ total_funding: newTotalFunding })
        .eq('id', startupId);

      if (updateError) {
        console.error('Error updating startup total funding:', updateError);
        // Don't throw here as the investment record was already added successfully
      }
    }

    return {
      id: data.id,
      date: data.date,
      investorType: data.investor_type as InvestorType,
      investmentType: data.investment_type as InvestmentRoundType,
      investorName: data.investor_name,
      investorCode: data.investor_code,
      amount: data.amount,
      equityAllocated: data.equity_allocated,
      shares: data.shares,
      pricePerShare: data.price_per_share,
      preMoneyValuation: data.pre_money_valuation,
      postMoneyValuation: data.post_money_valuation,
      proofUrl: data.proof_url
    };
  }

  async updateInvestmentRecord(id: string, investmentData: Partial<InvestmentRecord>): Promise<InvestmentRecord> {
    // First, get the current record to calculate funding difference
    const { data: currentRecord, error: fetchError } = await supabase
      .from('investment_records')
      .select('startup_id, amount')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const updateData: any = {};
    
    if (investmentData.date !== undefined) {
      // Validate investment date (no future dates allowed)
      const dateValidation = validateInvestmentDate(investmentData.date);
      if (!dateValidation.isValid) {
        throw new Error(dateValidation.error);
      }
      updateData.date = investmentData.date;
    }
    if (investmentData.investorType !== undefined) updateData.investor_type = investmentData.investorType;
    if (investmentData.investmentType !== undefined) updateData.investment_type = investmentData.investmentType;
    if (investmentData.investorName !== undefined) updateData.investor_name = investmentData.investorName;
    if (investmentData.investorCode !== undefined) updateData.investor_code = investmentData.investorCode;
    if (investmentData.amount !== undefined) updateData.amount = investmentData.amount;
    if (investmentData.equityAllocated !== undefined) updateData.equity_allocated = investmentData.equityAllocated;
    if (investmentData.preMoneyValuation !== undefined) updateData.pre_money_valuation = investmentData.preMoneyValuation;
    if ((investmentData as any).postMoneyValuation !== undefined) (updateData as any).post_money_valuation = (investmentData as any).postMoneyValuation;
    if ((investmentData as any).shares !== undefined) (updateData as any).shares = (investmentData as any).shares;
    if ((investmentData as any).pricePerShare !== undefined) (updateData as any).price_per_share = (investmentData as any).pricePerShare;
    if (investmentData.proofUrl !== undefined) updateData.proof_url = investmentData.proofUrl;

    const { data, error } = await supabase
      .from('investment_records')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update startup's total funding if amount changed
    if (investmentData.amount !== undefined && investmentData.amount !== currentRecord.amount) {
      const fundingDifference = investmentData.amount - currentRecord.amount;
      
      // Get current total funding
      const { data: currentStartup, error: fetchError2 } = await supabase
        .from('startups')
        .select('total_funding')
        .eq('id', currentRecord.startup_id)
        .single();

      if (fetchError2) {
        console.error('Error fetching current startup funding:', fetchError2);
      } else {
        // Update with new total
        const newTotalFunding = (currentStartup?.total_funding || 0) + fundingDifference;
        const { error: updateError } = await supabase
          .from('startups')
          .update({ total_funding: newTotalFunding })
          .eq('id', currentRecord.startup_id);

        if (updateError) {
          console.error('Error updating startup total funding:', updateError);
          // Don't throw here as the investment record was already updated successfully
        }
      }
    }

    return {
      id: data.id,
      date: data.date,
      investorType: data.investor_type as InvestorType,
      investmentType: data.investment_type as InvestmentRoundType,
      investorName: data.investor_name,
      investorCode: data.investor_code,
      amount: data.amount,
      equityAllocated: data.equity_allocated,
      preMoneyValuation: data.pre_money_valuation,
      postMoneyValuation: data.post_money_valuation,
      proofUrl: data.proof_url
    };
  }

  async deleteInvestmentRecord(id: string): Promise<void> {
    try {
      console.log('🗑️ Deleting investment record with ID:', id);
      
      // First, get the record details to update startup funding
      const { data: recordToDelete, error: fetchError } = await supabase
        .from('investment_records')
        .select('startup_id, amount')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching investment record:', fetchError);
        throw fetchError;
      }
      
      // Delete the investment record
      const { error: deleteError } = await supabase
        .from('investment_records')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('❌ Error deleting investment record:', deleteError);
        throw deleteError;
      }

      // Update startup's total funding by subtracting the deleted amount
      // First get current total funding
      const { data: currentStartup, error: fetchError3 } = await supabase
        .from('startups')
        .select('total_funding')
        .eq('id', recordToDelete.startup_id)
        .single();

      if (fetchError3) {
        console.error('Error fetching current startup funding:', fetchError3);
      } else {
        // Update with new total
        const newTotalFunding = Math.max(0, (currentStartup?.total_funding || 0) - recordToDelete.amount);
        const { error: updateError } = await supabase
          .from('startups')
          .update({ total_funding: newTotalFunding })
          .eq('id', recordToDelete.startup_id);

        if (updateError) {
          console.error('Error updating startup total funding:', updateError);
          // Don't throw here as the investment record was already deleted successfully
        }
      }

      console.log('✅ Investment record deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting investment record:', error);
      throw error;
    }
  }

  // Recalculate and sync startup's total funding with investment records
  async recalculateStartupTotalFunding(startupId: number): Promise<void> {
    try {
      console.log('🔄 Recalculating total funding for startup:', startupId);
      
      // Get all investment records for this startup
      const { data: investmentRecords, error: fetchError } = await supabase
        .from('investment_records')
        .select('amount')
        .eq('startup_id', startupId);

      if (fetchError) {
        console.error('❌ Error fetching investment records:', fetchError);
        throw fetchError;
      }

      // Calculate total funding from investment records
      const calculatedTotalFunding = investmentRecords.reduce((sum, record) => sum + (record.amount || 0), 0);
      
      // Update startup's total funding
      const { error: updateError } = await supabase
        .from('startups')
        .update({ total_funding: calculatedTotalFunding })
        .eq('id', startupId);

      if (updateError) {
        console.error('❌ Error updating startup total funding:', updateError);
        throw updateError;
      }

      console.log('✅ Startup total funding recalculated:', calculatedTotalFunding);
    } catch (error) {
      console.error('❌ Error recalculating startup total funding:', error);
      throw error;
    }
  }

  // Update startup funding after investment deletion
  async updateStartupFundingAfterDeletion(startupId: number, amountToSubtract: number): Promise<void> {
    try {
      console.log('💰 Updating startup funding after deletion:', { startupId, amountToSubtract });
      
      // First get current funding
      const { data: startup, error: fetchError } = await supabase
        .from('startups')
        .select('total_funding')
        .eq('id', startupId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching startup funding:', fetchError);
        throw fetchError;
      }

      if (!startup) {
        throw new Error('Startup not found');
      }

      const newFunding = Math.max(0, (startup.total_funding || 0) - amountToSubtract);
      
      // Update the funding
      const { error: updateError } = await supabase
        .from('startups')
        .update({ total_funding: newFunding })
        .eq('id', startupId);

      if (updateError) {
        console.error('❌ Error updating startup funding:', updateError);
        throw updateError;
      }

      console.log('✅ Startup funding updated successfully:', { oldFunding: startup.total_funding, newFunding });
    } catch (error) {
      console.error('❌ Error updating startup funding:', error);
      throw error;
    }
  }

  // =====================================================
  // FOUNDERS CRUD
  // =====================================================

  async getFounders(startupId: number): Promise<Founder[]> {
    console.log('🔍 Loading founders for startup:', startupId);
    
    const { data, error } = await supabase
      .from('founders')
      .select('*')
      .eq('startup_id', startupId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error loading founders:', error);
      throw error;
    }

    console.log('🔍 Raw founders data from database:', data);
    
    const mappedFounders = (data || []).map(founder => ({
      name: founder.name,
      email: founder.email,
      shares: founder.shares || 0,
      equityPercentage: founder.equity_percentage ? Number(founder.equity_percentage) : 0,
      mentorCode: founder.mentor_code || undefined
    }));
    
    console.log('🔍 Mapped founders data:', mappedFounders);
    return mappedFounders;
  }

  async updateFounders(startupId: number, founders: Founder[]): Promise<void> {
    // First, delete existing founders
    const { error: deleteError } = await supabase
      .from('founders')
      .delete()
      .eq('startup_id', startupId);

    if (deleteError) throw deleteError;

    // Then, insert new founders
    if (founders.length > 0) {
      const foundersData = founders.map(founder => ({
        startup_id: startupId,
        name: founder.name,
        email: founder.email,
        shares: founder.shares || 0,
        equity_percentage: founder.equityPercentage || 0,
        mentor_code: founder.mentorCode || null
      }));

      const { error: insertError } = await supabase
        .from('founders')
        .insert(foundersData);

      if (insertError) throw insertError;
    }
  }

  async deleteAllFounders(startupId: number): Promise<void> {
    const { error } = await supabase
      .from('founders')
      .delete()
      .eq('startup_id', startupId);

    if (error) throw error;
  }

  async addFounder(startupId: number, founder: Founder): Promise<void> {
    const { error } = await supabase
      .from('founders')
      .insert({
        startup_id: startupId,
        name: founder.name,
        email: founder.email,
        equity_percentage: founder.equityPercentage || null,
        shares: founder.shares || null,
        mentor_code: founder.mentorCode || null
      });

    if (error) throw error;
  }

  // =====================================================
  // FUNDRAISING DETAILS CRUD
  // =====================================================

  async getFundraisingDetails(startupId: number): Promise<FundraisingDetails[]> {
    const { data, error } = await supabase
      .from('fundraising_details')
      .select('*')
      .eq('startup_id', startupId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching fundraising details:', error);
      return [];
    }

    return (data || []).map(item => ({
      id: item.id, // Include ID for update operations
      active: item.active,
      type: item.type as InvestmentType,
      value: item.value,
      equity: item.equity,
      domain: item.domain as StartupDomain | undefined,
      stage: item.stage as StartupStage | undefined,
      validationRequested: item.validation_requested,
      pitchDeckUrl: item.pitch_deck_url,
      pitchVideoUrl: item.pitch_video_url,
      logoUrl: item.logo_url,
      businessPlanUrl: item.business_plan_url,
      websiteUrl: item.website_url,
      linkedInUrl: item.linkedin_url,
      onePagerUrl: item.one_pager_url,
      // One‑pager text fields (may be null in DB)
      onePagerDate: item.one_pager_date || null,
      onePagerOneLiner: item.one_pager_one_liner || null,
      problemStatement: item.problem_statement || null,
      solutionText: item.solution || null,
      growthChallenge: item.growth_challenge || null,
      uspText: item.usp || null,
      competitionText: item.competition || null,
      teamText: item.team || null,
      tamText: item.tam || null,
      samText: item.sam || null,
      somText: item.som || null,
      tractionText: item.traction || null,
      askUtilizationText: item.ask_utilization || null,
      revenueThisYear: item.revenue_this_year || null,
      revenueLastYear: item.revenue_last_year || null,
      revenueNextMonth: item.revenue_next_month || null,
      grossProfitMargin: item.gross_profit_margin || null,
      netProfitMargin: item.net_profit_margin || null,
      fixedCostLast3Months: item.fixed_cost_last_3_months || null
    }));
  }

  async updateFundraisingDetails(startupId: number, fundraisingData: FundraisingDetails): Promise<FundraisingDetails> {
    console.log('🔄 Updating fundraising details:', { startupId, fundraisingData });
    
    try {
      // Validate input data
      if (!startupId || startupId <= 0) {
        throw new Error('Invalid startup ID');
      }
      
      if (!fundraisingData.type) {
        throw new Error('Fundraising type is required');
      }
      
      // Allow saving even if value/equity are 0 (user might be setting up the round)
      // Only validate if they're trying to activate fundraising
      if (fundraisingData.active) {
        if (!fundraisingData.value || fundraisingData.value <= 0) {
          throw new Error('Valid fundraising value is required when fundraising is active');
        }
        
        if (!fundraisingData.equity || fundraisingData.equity <= 0 || fundraisingData.equity > 100) {
          throw new Error('Valid equity percentage (1-100%) is required when fundraising is active');
        }
      }
      
      // Check if fundraising details exist
      const existing = await this.getFundraisingDetails(startupId);
      console.log('📋 Existing fundraising details:', existing);

      const updateData = {
        active: fundraisingData.active,
        type: fundraisingData.type,
        value: fundraisingData.value,
        equity: fundraisingData.equity,
        domain: fundraisingData.domain || null,
        stage: fundraisingData.stage || null,
        validation_requested: fundraisingData.validationRequested,
        pitch_deck_url: fundraisingData.pitchDeckUrl || null,
        pitch_video_url: fundraisingData.pitchVideoUrl || null,
        logo_url: fundraisingData.logoUrl || null,
        business_plan_url: fundraisingData.businessPlanUrl || null,
        website_url: fundraisingData.websiteUrl || null,
        linkedin_url: fundraisingData.linkedInUrl || null,
        one_pager_url: fundraisingData.onePagerUrl || null,
        // One‑pager fields mapped into DB
        one_pager_date: fundraisingData.onePagerDate || null,
        one_pager_one_liner: fundraisingData.onePagerOneLiner || null,
        problem_statement: fundraisingData.problemStatement || null,
        solution: fundraisingData.solutionText || null,
        growth_challenge: fundraisingData.growthChallenge || null,
        usp: fundraisingData.uspText || null,
        competition: fundraisingData.competitionText || null,
        team: fundraisingData.teamText || null,
        tam: fundraisingData.tamText || null,
        sam: fundraisingData.samText || null,
        som: fundraisingData.somText || null,
        traction: fundraisingData.tractionText || null,
        ask_utilization: fundraisingData.askUtilizationText || null,
        revenue_this_year: fundraisingData.revenueThisYear || null,
        revenue_last_year: fundraisingData.revenueLastYear || null,
        revenue_next_month: fundraisingData.revenueNextMonth || null,
        gross_profit_margin: fundraisingData.grossProfitMargin || null,
        net_profit_margin: fundraisingData.netProfitMargin || null,
        fixed_cost_last_3_months: fundraisingData.fixedCostLast3Months || null
      };

      let data;

      // Always update an existing fundraising_details row for this startup.
      // Priority:
      // 1) If fundraisingData.id is present, update that specific row
      // 2) Else, update active record
      // 3) Else, update most recent record
      // 4) If no record exists, create a new one (upsert behavior)
      const byIdRecord = fundraisingData.id
        ? existing.find(r => r.id === fundraisingData.id)
        : undefined;
      const activeRecord = existing.find(r => r.active && r.id);
      const fallbackRecord = existing.length > 0 ? existing[0] : undefined;

      const target = byIdRecord || activeRecord || fallbackRecord;

      if (!target || !target.id) {
        // No existing record found - create a new one
        console.log('🆕 No existing fundraising record found, creating new record...');
        const insertData = {
          startup_id: startupId,
          ...updateData
        };
        
        const { data: insertedData, error: insertError } = await supabase
          .from('fundraising_details')
          .insert(insertData)
          .select()
          .single();

        if (insertError) {
          console.error('❌ Error creating fundraising details:', insertError);
          throw new Error(`Create failed: ${insertError.message}`);
        }

        data = insertedData;
        console.log('✅ Fundraising details created successfully:', data);
      } else {
        // Update existing record
        console.log('🔄 Updating fundraising record:', target.id);
        console.log('🔄 Update data being sent:', updateData);
        console.log('🔄 Target ID type:', typeof target.id, 'Value:', target.id);
        
        // Perform the update - use select() without single() to avoid coercion errors
        const { data: updatedData, error: updateError } = await supabase
          .from('fundraising_details')
          .update(updateData)
          .eq('id', target.id)
          .select(); // Returns array, more reliable than single()

        if (updateError) {
          console.error('❌ Error updating fundraising details:', updateError);
          console.error('❌ Update error details:', JSON.stringify(updateError, null, 2));
          throw new Error(`Update failed: ${updateError.message}`);
        }

        // Handle array response
        if (!updatedData || updatedData.length === 0) {
          console.warn('⚠️ Update query returned no rows, but update may have succeeded. Refetching...');
          // Update might have succeeded but RLS prevented returning data
          // Refetch directly from database to get raw format
          const { data: refetchData, error: refetchError } = await supabase
            .from('fundraising_details')
            .select('*')
            .eq('id', target.id)
            .maybeSingle(); // Use maybeSingle() to avoid error if no rows
          
          if (refetchError) {
            console.error('❌ Error refetching after update:', refetchError);
            // Fallback: use getFundraisingDetails and convert
            const refreshed = await this.getFundraisingDetails(startupId);
            const updated = refreshed.find(r => r.id === target.id) || refreshed.find(r => r.active) || refreshed[0];
            
            if (!updated) {
              throw new Error('Update may have succeeded but could not refetch the updated record');
            }
            
            // Convert FundraisingDetails format to database format
            data = {
              id: updated.id,
              active: updated.active,
              type: updated.type,
              value: updated.value,
              equity: updated.equity,
              domain: updated.domain,
              stage: updated.stage,
              validation_requested: updated.validationRequested,
              pitch_deck_url: updated.pitchDeckUrl,
              pitch_video_url: updated.pitchVideoUrl,
              business_plan_url: updated.businessPlanUrl,
              website_url: updated.websiteUrl,
              linkedin_url: updated.linkedInUrl,
              one_pager_url: updated.onePagerUrl,
              one_pager_date: updated.onePagerDate,
              one_pager_one_liner: updated.onePagerOneLiner,
              problem_statement: updated.problemStatement,
              solution: updated.solutionText,
              growth_challenge: updated.growthChallenge,
              usp: updated.uspText,
              competition: updated.competitionText,
              team: updated.teamText,
              tam: updated.tamText,
              sam: updated.samText,
              som: updated.somText,
              traction: updated.tractionText,
              ask_utilization: updated.askUtilizationText,
              revenue_this_year: updated.revenueThisYear,
              revenue_last_year: updated.revenueLastYear,
              revenue_next_month: updated.revenueNextMonth,
              gross_profit_margin: updated.grossProfitMargin,
              net_profit_margin: updated.netProfitMargin,
              fixed_cost_last_3_months: updated.fixedCostLast3Months
            };
            console.log('✅ Update succeeded (verified via getFundraisingDetails):', data);
          } else if (refetchData) {
            data = refetchData;
            console.log('✅ Update succeeded (verified via refetch):', data);
          } else {
            throw new Error('Update query returned no rows and refetch also returned no data');
          }
        } else {
          // Successfully got data back
          data = updatedData[0]; // Get first element from array
          console.log('✅ Fundraising details updated successfully:', data);
        }
      }

      // Safety: if PostgREST did not return the updated row (data undefined/null),
      // refetch the latest fundraising details and return the active/most-recent one.
      if (!data) {
        console.warn('⚠️ No data returned from update, refetching fundraising details...');
        const refreshed = await this.getFundraisingDetails(startupId);
        const active = refreshed.find(r => r.active) || refreshed[0];
        if (!active) {
          throw new Error('Fundraising details updated but no record found on refetch.');
        }
        return active;
      }

      return {
        id: data.id,
        active: data.active,
        type: data.type as InvestmentType,
        value: data.value,
        equity: data.equity,
        domain: data.domain as StartupDomain | undefined,
        stage: data.stage as StartupStage | undefined,
        validationRequested: data.validation_requested,
        pitchDeckUrl: data.pitch_deck_url,
        pitchVideoUrl: data.pitch_video_url,
        logoUrl: data.logo_url,
        businessPlanUrl: data.business_plan_url,
        websiteUrl: data.website_url,
        linkedInUrl: data.linkedin_url,
        onePagerUrl: data.one_pager_url,
        // One‑pager text fields
        onePagerDate: data.one_pager_date || null,
        onePagerOneLiner: data.one_pager_one_liner || null,
        problemStatement: data.problem_statement || null,
        solutionText: data.solution || null,
        growthChallenge: data.growth_challenge || null,
        uspText: data.usp || null,
        competitionText: data.competition || null,
        teamText: data.team || null,
        tamText: data.tam || null,
        samText: data.sam || null,
        somText: data.som || null,
        tractionText: data.traction || null,
        askUtilizationText: data.ask_utilization || null,
        revenueThisYear: data.revenue_this_year || null,
        revenueLastYear: data.revenue_last_year || null,
        revenueNextMonth: data.revenue_next_month || null,
        grossProfitMargin: data.gross_profit_margin || null,
        netProfitMargin: data.net_profit_margin || null,
        fixedCostLast3Months: data.fixed_cost_last_3_months || null
      };
    } catch (error) {
      console.error('❌ Fundraising details operation failed:', error);
      throw error;
    }
  }

  async updateOnePagerUrl(startupId: number, onePagerUrl: string): Promise<void> {
    console.log('🔄 Updating one-pager URL:', { startupId, onePagerUrl });
    
    try {
      // First, try to update the active fundraising record
      const { data: activeRecord, error: activeError } = await supabase
        .from('fundraising_details')
        .update({ one_pager_url: onePagerUrl })
        .eq('startup_id', startupId)
        .eq('active', true)
        .select();

      if (activeError) {
        console.error('❌ Error updating active record:', activeError);
        throw new Error(`Update failed: ${activeError.message}`);
      }

      // If no active record was updated, try updating the most recent record
      if (!activeRecord || activeRecord.length === 0) {
        console.log('⚠️ No active record found, updating most recent record');
        
        // Get the most recent record first
        const { data: recentRecords, error: fetchError } = await supabase
          .from('fundraising_details')
          .select('id')
          .eq('startup_id', startupId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (fetchError || !recentRecords || recentRecords.length === 0) {
          throw new Error('No fundraising record found to update');
        }

        // Update the most recent record
        const { error: updateError } = await supabase
          .from('fundraising_details')
          .update({ one_pager_url: onePagerUrl })
          .eq('id', recentRecords[0].id);

        if (updateError) {
          console.error('❌ Error updating recent record:', updateError);
          throw new Error(`Update failed: ${updateError.message}`);
        }
      }

      console.log('✅ One-pager URL updated successfully');
    } catch (error) {
      console.error('❌ One-pager URL update failed:', error);
      throw error;
    }
  }

  // =====================================================
  // VALUATION HISTORY CRUD
  // =====================================================

  async getValuationHistory(startupId: number): Promise<ValuationHistoryData[]> {
    const { data, error } = await supabase
      .from('valuation_history')
      .select('*')
      .eq('startup_id', startupId)
      .order('date', { ascending: true });

    if (error) throw error;

    return (data || []).map(record => ({
      round_name: record.round_type,
      valuation: record.valuation,
      investment_amount: record.investment_amount,
      date: record.date
    }));
  }

  async addValuationRecord(startupId: number, valuationData: {
    date: string;
    valuation: number;
    roundType: string;
    investmentAmount?: number;
    notes?: string;
  }): Promise<void> {
    // Validate valuation date (no future dates allowed)
    const dateValidation = validateValuationDate(valuationData.date);
    if (!dateValidation.isValid) {
      throw new Error(dateValidation.error);
    }

    const { error } = await supabase
      .from('valuation_history')
      .insert({
        startup_id: startupId,
        date: valuationData.date,
        valuation: valuationData.valuation,
        round_type: valuationData.roundType,
        investment_amount: valuationData.investmentAmount || 0,
        notes: valuationData.notes
      });

    if (error) throw error;
  }

  // =====================================================
  // EQUITY HOLDINGS CRUD
  // =====================================================

  async getEquityHoldings(startupId: number): Promise<EquityDistributionData[]> {
    const { data, error } = await supabase
      .from('equity_holdings')
      .select('*')
      .eq('startup_id', startupId)
      .order('equity_percentage', { ascending: false });

    if (error) throw error;

    return (data || []).map(record => ({
      holder_type: record.holder_type,
      equity_percentage: record.equity_percentage,
      total_amount: 0 // This would need to be calculated from investment records
    }));
  }

  async updateEquityHoldings(startupId: number, equityData: {
    holderType: string;
    holderName: string;
    equityPercentage: number;
  }[]): Promise<void> {
    // First, delete existing equity holdings
    const { error: deleteError } = await supabase
      .from('equity_holdings')
      .delete()
      .eq('startup_id', startupId);

    if (deleteError) throw deleteError;

    // Then, insert new equity holdings
    if (equityData.length > 0) {
      const holdingsData = equityData.map(holding => ({
        startup_id: startupId,
        holder_type: holding.holderType,
        holder_name: holding.holderName,
        equity_percentage: holding.equityPercentage
      }));

      const { error: insertError } = await supabase
        .from('equity_holdings')
        .insert(holdingsData);

      if (insertError) throw insertError;
    }
  }

  // =====================================================
  // ANALYTICS AND SUMMARY FUNCTIONS
  // =====================================================

  async getInvestmentSummary(startupId: number): Promise<InvestmentSummary> {
    try {
      const { data, error } = await supabase.rpc('get_investment_summary', {
        p_startup_id: startupId
      });

      if (error) {
        console.log('❌ Error calling get_investment_summary RPC, using manual calculation');
        return this.calculateInvestmentSummaryManually(startupId);
      }

      return data[0] || {
        total_equity_funding: 0,
        total_debt_funding: 0,
        total_grant_funding: 0,
        total_investments: 0,
        avg_equity_allocated: 0
      };
    } catch (error) {
      console.log('🔄 Falling back to manual calculation for investment summary');
      return this.calculateInvestmentSummaryManually(startupId);
    }
  }

  async getValuationHistoryData(startupId: number): Promise<ValuationHistoryData[]> {
    try {
      const { data, error } = await supabase.rpc('get_valuation_history', {
        p_startup_id: startupId
      });

      if (error) {
        console.log('❌ Error calling get_valuation_history RPC, using manual calculation');
        return this.calculateValuationHistoryManually(startupId);
      }

      return data || [];
    } catch (error) {
      console.log('🔄 Falling back to manual calculation for valuation history');
      return this.calculateValuationHistoryManually(startupId);
    }
  }

  async getEquityDistributionData(startupId: number): Promise<EquityDistributionData[]> {
    try {
      const { data, error } = await supabase.rpc('get_equity_distribution', {
        p_startup_id: startupId
      });

      if (error) {
        console.log('❌ Error calling get_equity_distribution RPC, using manual calculation');
        return this.calculateEquityDistributionManually(startupId);
      }

      return data || [];
    } catch (error) {
      console.log('🔄 Falling back to manual calculation for equity distribution');
      return this.calculateEquityDistributionManually(startupId);
    }
  }

  async getFundraisingStatus(startupId: number): Promise<FundraisingStatus | null> {
    try {
      const { data, error } = await supabase.rpc('get_fundraising_status', {
        p_startup_id: startupId
      });

      if (error) {
        console.log('❌ Error calling get_fundraising_status RPC, using direct query');
        const details = await this.getFundraisingDetails(startupId);
        if (details.length > 0) {
          const detail = details[0];
          return {
            active: detail.active,
            type: detail.type,
            value: detail.value,
            equity: detail.equity,
            validation_requested: detail.validationRequested,
            pitch_deck_url: detail.pitchDeckUrl,
            pitch_video_url: detail.pitchVideoUrl
          };
        }
        return null;
      }

      return data[0] || null;
    } catch (error) {
      console.log('🔄 Falling back to direct query for fundraising status');
      const details = await this.getFundraisingDetails(startupId);
      if (details.length > 0) {
        const detail = details[0];
        return {
          active: detail.active,
          type: detail.type,
          value: detail.value,
          equity: detail.equity,
          validation_requested: detail.validationRequested,
          pitch_deck_url: detail.pitchDeckUrl,
          pitch_video_url: detail.pitchVideoUrl
        };
      }
      return null;
    }
  }

  // =====================================================
  // MANUAL CALCULATION FALLBACKS
  // =====================================================

  private async calculateInvestmentSummaryManually(startupId: number): Promise<InvestmentSummary> {
    const investments = await this.getInvestmentRecords(startupId);
    
    const total_equity_funding = investments
      .filter(inv => inv.investmentType === InvestmentRoundType.Equity)
      .reduce((sum, inv) => sum + inv.amount, 0);
    
    const total_debt_funding = investments
      .filter(inv => inv.investmentType === InvestmentRoundType.Debt)
      .reduce((sum, inv) => sum + inv.amount, 0);
    
    const total_grant_funding = investments
      .filter(inv => inv.investmentType === InvestmentRoundType.Grant)
      .reduce((sum, inv) => sum + inv.amount, 0);
    
    const total_investments = investments.length;
    const avg_equity_allocated = total_investments > 0 
      ? investments.reduce((sum, inv) => sum + inv.equityAllocated, 0) / total_investments 
      : 0;
    
    return {
      total_equity_funding,
      total_debt_funding,
      total_grant_funding,
      total_investments,
      avg_equity_allocated
    };
  }

  private async calculateValuationHistoryManually(startupId: number): Promise<ValuationHistoryData[]> {
    console.log('🔄 Calculating valuation history manually for startup:', startupId);
    
    const investments = await this.getInvestmentRecords(startupId);
    console.log('📊 Found investments:', investments.length);
    
    if (investments.length === 0) {
      console.log('⚠️ No investments found, returning empty array');
      return [];
    }
    
    // Group investments by date and calculate cumulative valuation
    const valuationMap = new Map<string, { valuation: number; investment: number }>();
    
    investments.forEach(inv => {
      console.log('💰 Processing investment:', {
        date: inv.date,
        amount: inv.amount,
        preMoneyValuation: inv.preMoneyValuation,
        investorName: inv.investorName
      });
      
      const existing = valuationMap.get(inv.date) || { valuation: 0, investment: 0 };
      valuationMap.set(inv.date, {
        valuation: existing.valuation + inv.preMoneyValuation,
        investment: existing.investment + inv.amount
      });
    });
    
    const result = Array.from(valuationMap.entries()).map(([date, data]) => ({
      round_name: 'Investment Round',
      valuation: data.valuation,
      investment_amount: data.investment,
      date
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    console.log('📈 Manual valuation history result:', result);
    return result;
  }

  private async calculateEquityDistributionManually(startupId: number): Promise<EquityDistributionData[]> {
    const investments = await this.getInvestmentRecords(startupId);
    const founders = await this.getFounders(startupId);
    
    const distribution: EquityDistributionData[] = [];
    
    // Add founders (assuming equal distribution if not specified)
    if (founders.length > 0) {
      const founderEquity = 100 - investments.reduce((sum, inv) => sum + inv.equityAllocated, 0);
      const equityPerFounder = founderEquity / founders.length;
      
      founders.forEach(founder => {
        distribution.push({
          holder_type: 'Founder',
          equity_percentage: equityPerFounder,
          total_amount: 0
        });
      });
    }
    
    // Add investors
    investments.forEach(inv => {
      distribution.push({
        holder_type: 'Investor',
        equity_percentage: inv.equityAllocated,
        total_amount: inv.amount
      });
    });
    
    return distribution.sort((a, b) => b.equity_percentage - a.equity_percentage);
  }

  // =====================================================
  // UTILITY FUNCTIONS
  // =====================================================

  async getInvestorTypes(): Promise<string[]> {
    return Object.values(InvestorType);
  }

  async getInvestmentTypes(): Promise<string[]> {
    return Object.values(InvestmentRoundType);
  }

  async getInvestmentRounds(): Promise<string[]> {
    return Object.values(InvestmentType);
  }

  // =====================================================
  // FILE UPLOAD HELPERS
  // =====================================================

  async uploadProofDocument(startupId: number, file: File): Promise<string> {
    const fileName = `${startupId}/investment-proofs/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('cap-table-documents')
      .upload(fileName, file);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('cap-table-documents')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }

  async uploadPitchDeck(file: File, startupId: number): Promise<string> {
    const fileName = `${startupId}/pitch-decks/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('pitch-decks')
      .upload(fileName, file);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('pitch-decks')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }

  async uploadLogo(file: File, startupId: number): Promise<string> {
    // Use consistent filename to replace existing logo instead of creating new files
    // Extract file extension from original filename
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `${startupId}/logo.${fileExtension}`;
    
    // First, try to delete the existing logo if it exists (to ensure clean replacement)
    const existingFiles = await supabase.storage
      .from('logos')
      .list(`${startupId}/`, {
        search: 'logo'
      });
    
    if (existingFiles.data && existingFiles.data.length > 0) {
      // Delete all existing logo files for this startup
      const filesToDelete = existingFiles.data.map(f => `${startupId}/${f.name}`);
      await supabase.storage
        .from('logos')
        .remove(filesToDelete);
    }
    
    // Upload the new logo (this will replace if filename matches, or create new)
    const { data, error } = await supabase.storage
      .from('logos')
      .upload(fileName, file, {
        upsert: true // This replaces the file if it already exists
      });

    if (error) {
      console.error('Error uploading logo:', error);
      throw new Error(`Failed to upload logo: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('logos')
      .getPublicUrl(data.path);

    return publicUrl;
  }

  async uploadBusinessPlan(file: File, startupId: number): Promise<string> {
    // Use consistent filename to replace existing business plan instead of creating new files
    // Extract file extension from original filename
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const fileName = `${startupId}/business-plan.${fileExtension}`;
    
    // First, try to delete the existing business plan if it exists (to ensure clean replacement)
    const existingFiles = await supabase.storage
      .from('business-plans')
      .list(`${startupId}/`, {
        search: 'business-plan'
      });
    
    if (existingFiles.data && existingFiles.data.length > 0) {
      // Delete all existing business plan files for this startup
      const filesToDelete = existingFiles.data.map(f => `${startupId}/${f.name}`);
      await supabase.storage
        .from('business-plans')
        .remove(filesToDelete);
    }
    
    // Upload the new business plan (this will replace if filename matches, or create new)
    const { data, error } = await supabase.storage
      .from('business-plans')
      .upload(fileName, file, {
        upsert: true // This replaces the file if it already exists
      });

    if (error) {
      console.error('Error uploading business plan:', error);
      throw new Error(`Failed to upload business plan: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('business-plans')
      .getPublicUrl(data.path);

    return publicUrl;
  }

  async uploadOnePagerPDF(file: File, startupId: number): Promise<string> {
    // Use consistent filename - always the same name to replace existing PDF
    const fileName = `${startupId}/one-pagers/one-pager.pdf`;
    
    // First, try to delete the existing file if it exists (to ensure clean replacement)
    try {
      await supabase.storage
        .from('pitch-decks')
        .remove([fileName]);
    } catch (deleteError) {
      // Ignore error if file doesn't exist - that's fine, we'll upload new one
      console.log('No existing one-pager to delete (or already deleted)');
    }
    
    // Upload new PDF with upsert to replace any existing file
    const { data, error } = await supabase.storage
      .from('pitch-decks')
      .upload(fileName, file, {
        upsert: true, // Replace file if it exists
        cacheControl: '3600',
      });

    if (error) {
      // If upload fails, try without upsert as fallback
      const { data: retryData, error: retryError } = await supabase.storage
        .from('pitch-decks')
        .upload(fileName, file, {
          cacheControl: '3600',
        });
      
      if (retryError) throw retryError;
    }

    // Get the public URL (same URL every time since filename is consistent)
    const { data: urlData } = supabase.storage
      .from('pitch-decks')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }

  async getAttachmentDownloadUrl(url: string): Promise<string> {
    // If it's already a public URL, return it
    if (url.startsWith('http')) {
      return url;
    }

    // Extract file path from storage URL
    const filePath = this.extractFilePathFromUrl(url);
    if (!filePath) {
      throw new Error('Invalid file URL');
    }

    const { data } = supabase.storage
      .from('cap-table-documents')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  private extractFilePathFromUrl(url: string): string | null {
    // Handle different URL formats
    if (url.includes('/storage/v1/object/public/')) {
      return url.split('/storage/v1/object/public/')[1];
    }
    if (url.includes('/storage/v1/object/sign/')) {
      return url.split('/storage/v1/object/sign/')[1];
    }
    return null;
  }

  // =====================================================
  // REAL-TIME SUBSCRIPTIONS
  // =====================================================

  subscribeToInvestmentRecords(startupId: number, callback: (records: InvestmentRecord[]) => void) {
    const channel = supabase
      .channel('investment_records_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'investment_records',
        filter: `startup_id=eq.${startupId}`
      }, async () => {
        try {
          const records = await this.getInvestmentRecords(startupId);
          callback(records);
        } catch (e) {
          console.warn('Failed to refresh investment records after realtime event:', e);
        }
      })
      .subscribe();
    return channel;
  }

  subscribeToFounders(startupId: number, callback: (founders: Founder[]) => void) {
    const channel = supabase
      .channel('founders_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'founders',
        filter: `startup_id=eq.${startupId}`
      }, async () => {
        try {
          const founders = await this.getFounders(startupId);
          callback(founders);
        } catch (e) {
          console.warn('Failed to refresh founders after realtime event:', e);
        }
      })
      .subscribe();
    return channel;
  }

  subscribeToFundraisingDetails(startupId: number, callback: (details: FundraisingDetails[]) => void) {
    const channel = supabase
      .channel('fundraising_details_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'fundraising_details',
        filter: `startup_id=eq.${startupId}`
      }, async () => {
        try {
          const details = await this.getFundraisingDetails(startupId);
          callback(details);
        } catch (e) {
          console.warn('Failed to refresh fundraising details after realtime event:', e);
        }
      })
      .subscribe();
    return channel;
  }

  async addFundraisingDetails(startupId: number, fundraisingData: FundraisingDetails): Promise<FundraisingDetails> {
    const { data, error } = await supabase
      .from('fundraising_details')
      .insert({
        startup_id: startupId,
        active: fundraisingData.active,
        type: fundraisingData.type,
        value: fundraisingData.value,
        equity: fundraisingData.equity,
        validation_requested: fundraisingData.validationRequested,
        pitch_deck_url: fundraisingData.pitchDeckUrl,
        pitch_video_url: fundraisingData.pitchVideoUrl
      })
      .select()
      .single();

    if (error) throw error;

    return {
      active: data.active,
      type: data.type as InvestmentType,
      value: data.value,
      equity: data.equity,
      validationRequested: data.validation_requested,
      pitchDeckUrl: data.pitch_deck_url,
      pitchVideoUrl: data.pitch_video_url
    };
  }

  // Expose supabase client for direct subscriptions
  get supabase() {
    return supabase;
  }
}

export const capTableService = new CapTableService();
