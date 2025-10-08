import { supabase } from './supabase';

export interface InvestmentOffer {
  id: string;
  startupId: string;
  investorId: string;
  amount: number;
  equityPercentage: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  startupScoutingFee?: number;
  investorScoutingFee?: number;
}

export const investmentService = {
  // Get investment offers for a startup
  async getOffersForStartup(startupId: string): Promise<InvestmentOffer[]> {
    try {
      // First try the simple query without joins
      const { data, error } = await supabase
        .from('investment_offers')
        .select('*')
        .eq('startup_id', startupId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching investment offers:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error in getOffersForStartup:', err);
      return [];
    }
  },

  // Accept investment offer (simple version)
  async acceptOfferSimple(offerId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('investment_offers')
        .update({ status: 'accepted' })
        .eq('id', offerId);

      if (error) {
        console.error('Error accepting investment offer:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in acceptOfferSimple:', err);
      return false;
    }
  },

  // Accept investment offer with fee
  async acceptOfferWithFee(offerId: string, country: string, totalFunding: number): Promise<boolean> {
    try {
      // For now, just accept the offer - fee logic can be implemented later
      const { error } = await supabase
        .from('investment_offers')
        .update({ status: 'accepted' })
        .eq('id', offerId);

      if (error) {
        console.error('Error accepting investment offer with fee:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in acceptOfferWithFee:', err);
      return false;
    }
  },

  // Reject investment offer
  async rejectOffer(offerId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('investment_offers')
        .update({ status: 'rejected' })
        .eq('id', offerId);

      if (error) {
        console.error('Error rejecting investment offer:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error in rejectOffer:', err);
      return false;
    }
  }
};
