import { supabase } from './supabase'

export const testInvestmentOffers = {
  // Test if there are any investment offers in the database
  async checkAllInvestmentOffers(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🔍 Testing investment offers in database...')
      
      const { data, error } = await supabase
        .from('investment_offers')
        .select(`
          *,
          startup:startups(*)
        `)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('❌ Error fetching investment offers:', error)
        return { success: false, error: error.message }
      }
      
      console.log('✅ Investment offers found:', data?.length || 0)
      console.log('📊 Sample offers:', data?.slice(0, 3))
      
      return { 
        success: true, 
        data: {
          count: data?.length || 0,
          offers: data
        }
      }
    } catch (error) {
      console.error('❌ Error in testInvestmentOffers:', error)
      return { success: false, error: error.message }
    }
  },

  // Test offers for a specific startup
  async checkOffersForStartup(startupId: number): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log(`🔍 Testing investment offers for startup ${startupId}...`)
      
      const { data, error } = await supabase
        .from('investment_offers')
        .select(`
          *,
          startup:startups(*)
        `)
        .eq('startup_id', startupId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('❌ Error fetching offers for startup:', error)
        return { success: false, error: error.message }
      }
      
      console.log(`✅ Offers for startup ${startupId}:`, data?.length || 0)
      console.log('📊 Offers data:', data)
      
      return { 
        success: true, 
        data: {
          startupId,
          count: data?.length || 0,
          offers: data
        }
      }
    } catch (error) {
      console.error('❌ Error in checkOffersForStartup:', error)
      return { success: false, error: error.message }
    }
  }
}
