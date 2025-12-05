import { supabase } from './supabase';
import { MentorRecord, FeeType } from '../types';

export interface CreateMentorRecordData {
  startupId: number;
  mentorName: string;
  mentorCode: string;
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

export interface UpdateMentorRecordData {
  mentorName?: string;
  mentorCode?: string;
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

class MentorEquityService {
  // Get all mentor records for a startup
  async getMentorRecordsByStartupId(startupId: number): Promise<MentorRecord[]> {
    try {
      const { data, error } = await supabase
        .from('mentor_equity_records')
        .select('*')
        .eq('startup_id', startupId)
        .order('date_added', { ascending: false });

      if (error) {
        console.error('Error fetching mentor records:', error);
        throw error;
      }

      return (data || []).map(record => ({
        id: record.id.toString(),
        startupId: record.startup_id,
        mentorName: record.mentor_name,
        mentorCode: record.mentor_code,
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
      console.error('Error in getMentorRecordsByStartupId:', error);
      throw error;
    }
  }

  // Create a new mentor record
  async createMentorRecord(recordData: CreateMentorRecordData): Promise<MentorRecord> {
    try {
      console.log('🚀 Creating mentor record for startup:', recordData.startupId);
      console.log('📋 Record data:', recordData);
      
      const { data, error } = await supabase
        .from('mentor_equity_records')
        .insert({
          startup_id: recordData.startupId,
          mentor_name: recordData.mentorName,
          mentor_code: recordData.mentorCode,
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
        console.error('❌ Error creating mentor record:', error);
        throw error;
      }

      console.log('✅ Mentor record created successfully:', data);

      return {
        id: data.id.toString(),
        startupId: data.startup_id,
        mentorName: data.mentor_name,
        mentorCode: data.mentor_code,
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
      console.error('❌ Error in createMentorRecord:', error);
      throw error;
    }
  }

  // Update an existing mentor record
  async updateMentorRecord(recordId: string, updateData: UpdateMentorRecordData): Promise<MentorRecord> {
    try {
      const updatePayload: any = {};
      
      if (updateData.mentorName !== undefined) updatePayload.mentor_name = updateData.mentorName;
      if (updateData.mentorCode !== undefined) updatePayload.mentor_code = updateData.mentorCode;
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
        .from('mentor_equity_records')
        .update(updatePayload)
        .eq('id', recordId)
        .select()
        .single();

      if (error) {
        console.error('Error updating mentor record:', error);
        throw error;
      }

      return {
        id: data.id.toString(),
        startupId: data.startup_id,
        mentorName: data.mentor_name,
        mentorCode: data.mentor_code,
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
      console.error('Error in updateMentorRecord:', error);
      throw error;
    }
  }

  // Delete a mentor record
  async deleteMentorRecord(recordId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mentor_equity_records')
        .delete()
        .eq('id', recordId);

      if (error) {
        console.error('Error deleting mentor record:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteMentorRecord:', error);
      throw error;
    }
  }

  // Validate mentor code exists
  async validateMentorCode(mentorCode: string): Promise<boolean> {
    try {
      console.log('🔍 Validating mentor code:', mentorCode);
      
      const { data, error } = await supabase
        .from('users')
        .select('id, mentor_code, name, role')
        .eq('mentor_code', mentorCode)
        .eq('role', 'Mentor')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('❌ No mentor found with code:', mentorCode);
          return false;
        }
        console.error('❌ Error validating mentor code:', error);
        throw error;
      }

      if (data) {
        console.log('✅ Mentor found:', { id: data.id, code: data.mentor_code, name: data.name, role: data.role });
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error in validateMentorCode:', error);
      return false;
    }
  }
}

export const mentorEquityService = new MentorEquityService();


