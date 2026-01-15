import { supabase } from './supabase';

/**
 * Country Price Service
 * Fetches prices in INR for each country from admin settings
 */

export interface CountryPrice {
  id: string;
  country: string;
  plan_tier: 'free' | 'basic' | 'premium';
  base_price_eur: number;
  price_inr: number | null;
  price_eur: number | null;
  currency: string;
  payment_gateway: 'razorpay' | 'stripe' | 'paypal';
  is_active: boolean;
}

export class CountryPriceService {
  /**
   * Get price for a specific country and plan tier
   */
  async getCountryPrice(
    country: string,
    planTier: 'free' | 'basic' | 'premium'
  ): Promise<CountryPrice | null> {
    try {
      const { data, error } = await supabase
        .from('country_plan_prices')
        .select('*')
        .eq('country', country)
        .eq('plan_tier', planTier)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No price found - return null (will use EUR base price)
          return null;
        }
        console.error('Error fetching country price:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getCountryPrice:', error);
      return null;
    }
  }

  /**
   * Get all prices for a country
   */
  async getCountryPrices(country: string): Promise<CountryPrice[]> {
    try {
      const { data, error } = await supabase
        .from('country_plan_prices')
        .select('*')
        .eq('country', country)
        .eq('is_active', true)
        .order('plan_tier');

      if (error) {
        console.error('Error fetching country prices:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCountryPrices:', error);
      return [];
    }
  }

  /**
   * Get all countries with prices
   */
  async getAllCountries(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('country_plan_prices')
        .select('country')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching countries:', error);
        return [];
      }

      // Get unique countries
      const countries = [...new Set((data || []).map(item => item.country))];
      return countries.sort();
    } catch (error) {
      console.error('Error in getAllCountries:', error);
      return [];
    }
  }

  /**
   * Determine payment gateway for country
   */
  getPaymentGateway(country: string): 'razorpay' | 'stripe' | 'paypal' {
    const indianCountries = ['India', 'IN', 'IND', 'भारत'];
    const normalizedCountry = country?.trim() || '';
    
    const isIndia = indianCountries.some(indianCountry => 
      normalizedCountry.toLowerCase() === indianCountry.toLowerCase() ||
      normalizedCountry.toLowerCase().includes(indianCountry.toLowerCase())
    );

    return isIndia ? 'razorpay' : 'stripe'; // Will be stripe or paypal based on approval
  }
}

// Export singleton instance
export const countryPriceService = new CountryPriceService();
