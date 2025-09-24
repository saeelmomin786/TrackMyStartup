import { supabase } from './supabase';
import { RecognitionRecord, IncubationType, FeeType } from '../types';

export interface CreateRecognitionRecordData {
  startupId: number;
  programName: string;
  facilitatorName: string;
  facilitatorCode: string;
  incubationType: IncubationType;
  feeType: FeeType;
  feeAmount?: number;
  shares?: number;
  pricePerShare?: number;
  investmentAmount?: number;
  equityAllocated?: number;
  postMoneyValuation?: number;
  signedAgreementUrl?: string;
  status?: string;
}

export interface UpdateRecognitionRecordData {
  programName?: string;
  facilitatorName?: string;
  facilitatorCode?: string;
  incubationType?: IncubationType;
  feeType?: FeeType;
  feeAmount?: number;
  shares?: number;
  pricePerShare?: number;
  investmentAmount?: number;
  equityAllocated?: number;
  postMoneyValuation?: number;
  signedAgreementUrl?: string;
  status?: string;
}

class RecognitionService {
  // Get all recognition records for a startup
  async getRecognitionRecordsByStartupId(startupId: number): Promise<RecognitionRecord[]> {
    try {
      const { data, error } = await supabase
        .from('recognition_records')
        .select('*')
        .eq('startup_id', startupId)
        .order('date_added', { ascending: false });

      if (error) {
        console.error('Error fetching recognition records:', error);
        throw error;
      }

      return (data || []).map(record => ({
        id: record.id.toString(),
        startupId: record.startup_id,
        programName: record.program_name,
        facilitatorName: record.facilitator_name,
        facilitatorCode: record.facilitator_code,
        incubationType: record.incubation_type as IncubationType,
        feeType: record.fee_type as FeeType,
        feeAmount: record.fee_amount,
        shares: record.shares,
        pricePerShare: record.price_per_share,
        investmentAmount: record.investment_amount,
        equityAllocated: record.equity_allocated,
        postMoneyValuation: record.post_money_valuation,
        signedAgreementUrl: record.signed_agreement_url,
        status: record.status || 'pending',
        dateAdded: record.date_added
      }));
    } catch (error) {
      console.error('Error in getRecognitionRecordsByStartupId:', error);
      throw error;
    }
  }

  // Get recognition records by facilitator code
  async getRecognitionRecordsByFacilitatorCode(facilitatorCode: string): Promise<RecognitionRecord[]> {
    try {
      const { data, error } = await supabase
        .from('recognition_records')
        .select(`
          *,
          startups!recognition_records_startup_id_fkey (
            id,
            name,
            sector,
            total_funding,
            total_revenue,
            registration_date
          )
        `)
        .eq('facilitator_code', facilitatorCode)
        .order('date_added', { ascending: false });

      if (error) {
        console.error('Error fetching recognition records by facilitator code:', error);
        throw error;
      }

      return (data || []).map(record => ({
        id: record.id.toString(),
        startupId: record.startup_id,
        programName: record.program_name,
        facilitatorName: record.facilitator_name,
        facilitatorCode: record.facilitator_code,
        incubationType: record.incubation_type as IncubationType,
        feeType: record.fee_type as FeeType,
        feeAmount: record.fee_amount,
        shares: record.shares,
        pricePerShare: record.price_per_share,
        investmentAmount: record.investment_amount,
        equityAllocated: record.equity_allocated,
        postMoneyValuation: record.post_money_valuation,
        signedAgreementUrl: record.signed_agreement_url,
        status: record.status || 'pending',
        dateAdded: record.date_added
      }));
    } catch (error) {
      console.error('Error in getRecognitionRecordsByFacilitatorCode:', error);
      throw error;
    }
  }

  // Create a new recognition record
  async createRecognitionRecord(recordData: CreateRecognitionRecordData): Promise<RecognitionRecord> {
    try {
      console.log('🚀 Creating recognition record for startup:', recordData.startupId);
      console.log('📋 Record data:', recordData);
      
      // Insert into the original recognition_records table
      const { data, error } = await supabase
        .from('recognition_records')
        .insert({
          startup_id: recordData.startupId,
          program_name: recordData.programName,
          facilitator_name: recordData.facilitatorName,
          facilitator_code: recordData.facilitatorCode,
          incubation_type: recordData.incubationType,
          fee_type: recordData.feeType,
          fee_amount: recordData.feeAmount,
          shares: recordData.shares,
          price_per_share: recordData.pricePerShare,
          investment_amount: recordData.investmentAmount,
          equity_allocated: recordData.equityAllocated,
          post_money_valuation: recordData.postMoneyValuation,
          signed_agreement_url: recordData.signedAgreementUrl,
          status: recordData.status || 'pending',
          date_added: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating recognition record:', error);
        throw error;
      }

      console.log('✅ Recognition record created successfully:', data);

      return {
        id: data.id.toString(),
        startupId: data.startup_id,
        programName: data.program_name,
        facilitatorName: data.facilitator_name,
        facilitatorCode: data.facilitator_code,
        incubationType: data.incubation_type as IncubationType,
        feeType: data.fee_type as FeeType,
        feeAmount: data.fee_amount,
        shares: data.shares,
        pricePerShare: data.price_per_share,
        investmentAmount: data.investment_amount,
        equityAllocated: data.equity_allocated,
        postMoneyValuation: data.post_money_valuation,
        signedAgreementUrl: data.signed_agreement_url,
        status: data.status || 'pending',
        dateAdded: data.date_added
      };
    } catch (error) {
      console.error('❌ Error in createRecognitionRecord:', error);
      throw error;
    }
  }

  // Update an existing recognition record
  async updateRecognitionRecord(recordId: string, updateData: UpdateRecognitionRecordData): Promise<RecognitionRecord> {
    try {
      const updatePayload: any = {};
      
      if (updateData.programName !== undefined) updatePayload.program_name = updateData.programName;
      if (updateData.facilitatorName !== undefined) updatePayload.facilitator_name = updateData.facilitatorName;
      if (updateData.facilitatorCode !== undefined) updatePayload.facilitator_code = updateData.facilitatorCode;
      if (updateData.incubationType !== undefined) updatePayload.incubation_type = updateData.incubationType;
      if (updateData.feeType !== undefined) updatePayload.fee_type = updateData.feeType;
      if (updateData.feeAmount !== undefined) updatePayload.fee_amount = updateData.feeAmount;
      if (updateData.shares !== undefined) updatePayload.shares = updateData.shares;
      if (updateData.pricePerShare !== undefined) updatePayload.price_per_share = updateData.pricePerShare;
      if (updateData.investmentAmount !== undefined) updatePayload.investment_amount = updateData.investmentAmount;
      if (updateData.equityAllocated !== undefined) updatePayload.equity_allocated = updateData.equityAllocated;
      if (updateData.postMoneyValuation !== undefined) updatePayload.post_money_valuation = updateData.postMoneyValuation;
      if (updateData.signedAgreementUrl !== undefined) updatePayload.signed_agreement_url = updateData.signedAgreementUrl;
      if (updateData.status !== undefined) updatePayload.status = updateData.status;

      const { data, error } = await supabase
        .from('recognition_records')
        .update(updatePayload)
        .eq('id', recordId)
        .select()
        .single();

      if (error) {
        console.error('Error updating recognition record:', error);
        throw error;
      }

      return {
        id: data.id.toString(),
        startupId: data.startup_id,
        programName: data.program_name,
        facilitatorName: data.facilitator_name,
        facilitatorCode: data.facilitator_code,
        incubationType: data.incubation_type as IncubationType,
        feeType: data.fee_type as FeeType,
        feeAmount: data.fee_amount,
        shares: data.shares,
        pricePerShare: data.price_per_share,
        investmentAmount: data.investment_amount,
        equityAllocated: data.equity_allocated,
        postMoneyValuation: data.post_money_valuation,
        signedAgreementUrl: data.signed_agreement_url,
        status: data.status || 'pending',
        dateAdded: data.date_added
      };
    } catch (error) {
      console.error('Error in updateRecognitionRecord:', error);
      throw error;
    }
  }

  // Delete a recognition record
  async deleteRecognitionRecord(recordId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('recognition_records')
        .delete()
        .eq('id', recordId);

      if (error) {
        console.error('Error deleting recognition record:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteRecognitionRecord:', error);
      throw error;
    }
  }

  // Get recognition record by ID
  async getRecognitionRecordById(recordId: string): Promise<RecognitionRecord | null> {
    try {
      const { data, error } = await supabase
        .from('recognition_records')
        .select('*')
        .eq('id', recordId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        console.error('Error fetching recognition record by ID:', error);
        throw error;
      }

      return {
        id: data.id.toString(),
        startupId: data.startup_id,
        programName: data.program_name,
        facilitatorName: data.facilitator_name,
        facilitatorCode: data.facilitator_code,
        incubationType: data.incubation_type as IncubationType,
        feeType: data.fee_type as FeeType,
        feeAmount: data.fee_amount,
        shares: data.shares,
        pricePerShare: data.price_per_share,
        investmentAmount: data.investment_amount,
        equityAllocated: data.equity_allocated,
        postMoneyValuation: data.post_money_valuation,
        signedAgreementUrl: data.signed_agreement_url,
        status: data.status || 'pending',
        dateAdded: data.date_added
      };
    } catch (error) {
      console.error('Error in getRecognitionRecordById:', error);
      throw error;
    }
  }

  // Validate facilitator code exists
  async validateFacilitatorCode(facilitatorCode: string): Promise<boolean> {
    try {
      console.log('🔍 Validating facilitator code:', facilitatorCode);
      
      const { data, error } = await supabase
        .from('users')
        .select('id, facilitator_code, name, role')
        .eq('facilitator_code', facilitatorCode)
        .eq('role', 'Startup Facilitation Center')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          console.log('❌ No facilitator found with code:', facilitatorCode);
          return false;
        }
        console.error('❌ Error validating facilitator code:', error);
        throw error;
      }

      if (data) {
        console.log('✅ Facilitator found:', { id: data.id, code: data.facilitator_code, name: data.name, role: data.role });
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error in validateFacilitatorCode:', error);
      return false;
    }
  }

  // Get startup details for a recognition record
  async getStartupDetailsForRecognition(recordId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('recognition_records')
        .select(`
          *,
          startups!recognition_records_startup_id_fkey (
            id,
            name,
            sector,
            total_funding,
            total_revenue,
            registration_date
          )
        `)
        .eq('id', recordId)
        .single();

      if (error) {
        console.error('Error fetching startup details for recognition:', error);
        throw error;
      }

      return {
        recognitionRecord: {
          id: data.id.toString(),
          startupId: data.startup_id,
          programName: data.program_name,
          facilitatorName: data.facilitator_name,
          facilitatorCode: data.facilitator_code,
          incubationType: data.incubation_type as IncubationType,
          feeType: data.fee_type as FeeType,
          feeAmount: data.fee_amount,
          shares: data.shares,
          pricePerShare: data.price_per_share,
          investmentAmount: data.investment_amount,
          equityAllocated: data.equity_allocated,
          postMoneyValuation: data.post_money_valuation,
          signedAgreementUrl: data.signed_agreement_url,
          dateAdded: data.date_added
        },
        startup: data.startups
      };
    } catch (error) {
      console.error('Error in getStartupDetailsForRecognition:', error);
      throw error;
    }
  }

  // Approve a recognition record
  async approveRecognitionRecord(recordId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('recognition_records')
        .update({ status: 'approved' })
        .eq('id', recordId);

      if (error) {
        console.error('Error approving recognition record:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in approveRecognitionRecord:', error);
      throw error;
    }
  }
}

export const recognitionService = new RecognitionService();
